const Reservation = require('../models/Reservation');
const Table = require('../models/Table');

// Helper to find available tables for a slot and guest count
const findAvailableTablesHelper = async (date, timeSlot, guests, excludeReservationId = null) => {
  // Find all tables that can fit the guests
  const eligibleTables = await Table.find({ capacity: { $gte: guests } });
  if (eligibleTables.length === 0) {
    return [];
  }

  // Find all confirmed reservations for this slot
  const query = {
    date,
    timeSlot,
    status: 'confirmed'
  };
  
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }

  const confirmedReservations = await Reservation.find(query);
  const reservedTableIds = confirmedReservations.map(r => r.table.toString());

  // Filter out reserved tables
  return eligibleTables.filter(t => !reservedTableIds.includes(t._id.toString()));
};

// @desc    Get available tables for a slot
// @route   GET /api/reservations/availability
// @access  Private
const checkAvailability = async (req, res, next) => {
  try {
    const { date, timeSlot, guests } = req.query;

    if (!date || !timeSlot || !guests) {
      return res.status(400).json({ success: false, error: 'Please provide date, timeSlot, and guests count' });
    }

    const guestCount = parseInt(guests, 10);
    if (isNaN(guestCount) || guestCount <= 0) {
      return res.status(422).json({ success: false, error: 'Guest count must be a positive integer' });
    }

    // Guest count maximum table capacity boundary (8 guests)
    if (guestCount > 8) {
      return res.status(422).json({ success: false, error: 'Group size exceeds maximum table capacity (8 guests)' });
    }

    // Past-date check
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    
    if (date < todayStr) {
      return res.status(422).json({ success: false, error: 'Cannot check availability for a past date' });
    }
    
    if (date === todayStr) {
      const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
      const currentHour = now.getHours();
      if (currentHour >= slotStartHour) {
        return res.status(422).json({ success: false, error: 'Cannot check availability for a past time slot' });
      }
    }

    const availableTables = await findAvailableTablesHelper(date, timeSlot, guestCount);

    res.status(200).json({
      success: true,
      data: availableTables,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a reservation
// @route   POST /api/reservations
// @access  Private
const createReservation = async (req, res, next) => {
  try {
    const { date, timeSlot, guests, table: requestedTableId } = req.body;

    const availableTables = await findAvailableTablesHelper(date, timeSlot, guests);
    if (availableTables.length === 0) {
      return res.status(409).json({
        success: false,
        error: 'No tables with sufficient capacity are available for this date and time slot.'
      });
    }

    let selectedTable;

    if (requestedTableId) {
      // Verify table exists, capacity, and availability
      selectedTable = availableTables.find(t => t._id.toString() === requestedTableId);
      if (!selectedTable) {
        const dbTable = await Table.findById(requestedTableId);
        if (!dbTable) {
          return res.status(404).json({ success: false, error: 'Requested table not found' });
        }
        if (dbTable.capacity < guests) {
          return res.status(422).json({ success: false, error: `Table capacity (${dbTable.capacity}) is insufficient for ${guests} guests` });
        }
        return res.status(409).json({ success: false, error: 'The requested table is already reserved' });
      }
    } else {
      // Auto-assign: pick smallest table that fits guests
      availableTables.sort((a, b) => a.capacity - b.capacity);
      selectedTable = availableTables[0];
    }

    const reservation = new Reservation({
      table: selectedTable._id,
      user: req.user._id,
      date,
      timeSlot,
      guests,
      status: 'confirmed'
    });

    await reservation.save();
    await reservation.populate('table');

    res.status(201).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error); // catches unique constraint 11000 duplicate keys, maps to 409
  }
};

// @desc    Get current user's reservations
// @route   GET /api/reservations/me
// @access  Private
const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .populate('table')
      .sort({ date: -1, timeSlot: -1 });

    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reservations (Admin only)
// @route   GET /api/reservations
// @access  Private/Admin
const getAllReservations = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.date) {
      filter.date = req.query.date;
    }

    const reservations = await Reservation.find(filter)
      .populate('table')
      .populate('user', 'name email')
      .sort({ date: 1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a reservation (Customer cancels own, Admin cancels any)
// @route   PATCH /api/reservations/:id/cancel
// @access  Private
const cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    if (req.user.role !== 'admin' && reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this reservation' });
    }

    reservation.status = 'cancelled';
    await reservation.save();
    await reservation.populate('table');

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a reservation (Admin only)
// @route   PATCH /api/reservations/:id
// @access  Private/Admin
const updateReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    const { date, timeSlot, guests, table: requestedTableId, status } = req.body;

    const needsAvailabilityCheck = 
      (date && date !== reservation.date) ||
      (timeSlot && timeSlot !== reservation.timeSlot) ||
      (requestedTableId && requestedTableId !== reservation.table.toString()) ||
      (status === 'confirmed' && reservation.status === 'cancelled');

    const targetDate = date || reservation.date;
    const targetSlot = timeSlot || reservation.timeSlot;
    const targetGuests = guests || reservation.guests;
    const targetTableId = requestedTableId || reservation.table.toString();

    // Check table capacity first
    const tableObj = await Table.findById(targetTableId);
    if (!tableObj) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    if (tableObj.capacity < targetGuests) {
      return res.status(422).json({ success: false, error: `Table capacity (${tableObj.capacity}) is insufficient for ${targetGuests} guests` });
    }

    // Availability validation if key fields changed
    if (needsAvailabilityCheck && status !== 'cancelled') {
      const availableTables = await findAvailableTablesHelper(targetDate, targetSlot, targetGuests, reservation._id);
      const isAvailable = availableTables.some(t => t._id.toString() === targetTableId);
      if (!isAvailable) {
        return res.status(409).json({ success: false, error: 'The selected table is already reserved for this date and time slot' });
      }
    }

    if (date) reservation.date = date;
    if (timeSlot) reservation.timeSlot = timeSlot;
    if (guests) reservation.guests = guests;
    if (requestedTableId) reservation.table = requestedTableId;
    if (status) reservation.status = status;

    await reservation.save();
    await reservation.populate('table');
    await reservation.populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkAvailability,
  createReservation,
  getMyReservations,
  getAllReservations,
  cancelReservation,
  updateReservation
};
