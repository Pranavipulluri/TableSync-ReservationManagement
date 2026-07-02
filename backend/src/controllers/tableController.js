const Table = require('../models/Table');

// @desc    Create a new table
// @route   POST /api/tables
// @access  Private/Admin
const createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;

    const tableExists = await Table.findOne({ tableNumber });
    if (tableExists) {
      return res.status(400).json({ success: false, error: `Table number ${tableNumber} already exists` });
    }

    const table = await Table.create({ tableNumber, capacity });

    res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tables
// @route   GET /api/tables
// @access  Private
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find({}).sort({ tableNumber: 1 });
    res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a table
// @route   DELETE /api/tables/:id
// @access  Private/Admin
const deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    await table.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTable,
  getTables,
  deleteTable,
};
