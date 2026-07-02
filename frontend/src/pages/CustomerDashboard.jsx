import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Plus, CheckCircle, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';

const CustomerDashboard = ({ token, user, apiUrl }) => {
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  
  // Form State
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('18:00-19:00');
  const [guests, setGuests] = useState(2);
  const [selectedTable, setSelectedTable] = useState('');
  
  // Availability state
  const [availableTables, setAvailableTables] = useState([]);
  const [checkedAvailability, setCheckedAvailability] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recommendedTable, setRecommendedTable] = useState(null);
  
  // Feedback states
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Set default date to today's local string
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
  }, []);

  const fetchMyReservations = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/reservations/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setReservations(data.data);
      } else {
        setActionError(data.error || 'Failed to load reservations');
      }
    } catch (err) {
      setActionError('Network error loading reservations');
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => {
    fetchMyReservations();
  }, [token]);

  // Handle Availability Query
  const checkAvailableTables = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setChecking(true);
    setAvailableTables([]);
    setCheckedAvailability(false);
    setRecommendedTable(null);
    setSelectedTable('');

    try {
      const response = await fetch(
        `${apiUrl}/api/reservations/availability?date=${date}&timeSlot=${timeSlot}&guests=${guests}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check table availability');
      }

      const tables = data.data;
      setAvailableTables(tables);
      setCheckedAvailability(true);

      if (tables.length > 0) {
        // Sort by capacity ascending to get the best fit (smallest fitting table)
        const sorted = [...tables].sort((a, b) => a.capacity - b.capacity);
        setRecommendedTable(sorted[0]);
        setSelectedTable(sorted[0]._id); // Default select the recommended one
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setChecking(false);
    }
  };

  // Handle Booking submission
  const handleBookTable = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setBookingLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          timeSlot,
          guests: parseInt(guests, 10),
          table: selectedTable || undefined // if empty, server auto-assigns
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Booking attempt failed');
      }

      setActionSuccess(`Table reserved successfully! Your booking for table ${data.data.table.tableNumber} is confirmed.`);
      setCheckedAvailability(false);
      setAvailableTables([]);
      setRecommendedTable(null);
      setSelectedTable('');
      
      // Refresh list
      fetchMyReservations();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Cancellation
  const handleCancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }
    setActionError('');
    setActionSuccess('');

    try {
      const response = await fetch(`${apiUrl}/api/reservations/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel reservation');
      }

      setActionSuccess('Reservation cancelled successfully.');
      fetchMyReservations();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Booking Panel */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3 className="section-title">Reserve a Table</h3>
        </div>

        {actionSuccess && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{actionError}</span>
          </div>
        )}

        <div className="card" style={{ padding: '1.75rem' }}>
          <form onSubmit={checkAvailableTables}>
            <div className="form-group">
              <label className="form-label">
                <Calendar size={12} style={{ marginRight: '5px' }} />
                Reservation Date
              </label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setCheckedAvailability(false);
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Clock size={12} style={{ marginRight: '5px' }} />
                Time Slot
              </label>
              <select
                className="form-control"
                value={timeSlot}
                onChange={(e) => {
                  setTimeSlot(e.target.value);
                  setCheckedAvailability(false);
                }}
                required
              >
                <option value="12:00-13:00">12:00 PM - 01:00 PM</option>
                <option value="13:00-14:00">01:00 PM - 02:00 PM</option>
                <option value="17:00-18:00">05:00 PM - 06:00 PM</option>
                <option value="18:00-19:00">06:00 PM - 07:00 PM</option>
                <option value="19:00-20:00">07:00 PM - 08:00 PM</option>
                <option value="20:00-21:00">08:00 PM - 09:00 PM</option>
                <option value="21:00-22:00">09:00 PM - 10:00 PM</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Users size={12} style={{ marginRight: '5px' }} />
                Number of Guests
              </label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="8"
                value={guests}
                onChange={(e) => {
                  setGuests(e.target.value);
                  setCheckedAvailability(false);
                }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-block"
              disabled={checking || !date}
            >
              {checking ? 'Checking availability...' : 'Find Available Tables'}
            </button>
          </form>

          {/* Availability Results & Confirmation Form */}
          {checkedAvailability && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              {availableTables.length === 0 ? (
                <div className="alert alert-error" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={18} />
                  <span>No tables available for {guests} guests at this slot. Please select a different date or time.</span>
                </div>
              ) : (
                <form onSubmit={handleBookTable}>
                  {recommendedTable && (
                    <div className="suggestion-banner">
                      <span>
                        <span className="suggestion-highlight">Auto-suggested: </span>
                        Table {recommendedTable.tableNumber} (Capacity: {recommendedTable.capacity}) has been pre-selected as the ideal fit.
                      </span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Selected Table</label>
                    <select
                      className="form-control"
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                    >
                      {availableTables.map((t) => (
                        <option key={t._id} value={t._id}>
                          Table {t.tableNumber} (Capacity: {t.capacity} guests)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Processing Booking...' : 'Confirm Reservation'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reservations List */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3 className="section-title">My Bookings</h3>
          <button onClick={fetchMyReservations} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {loadingReservations ? (
          <p style={{ color: 'var(--text-light)', textAlign: 'center' }}>Loading your reservations...</p>
        ) : reservations.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-icon" />
            <p>You have no current or past bookings.</p>
            <p style={{ fontSize: '0.85rem' }}>Use the form on the left to make your first reservation.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reservations.map((res) => (
              <div
                key={res._id}
                className={`reservation-card ${res.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}
              >
                <div className="reservation-header">
                  <div>
                    <h4 className="reservation-title">Table {res.table?.tableNumber || 'Deleted'}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      Capacity: {res.table?.capacity || 0} guests
                    </span>
                  </div>
                  <span className={`reservation-status status-${res.status}`}>
                    {res.status}
                  </span>
                </div>

                <div className="reservation-details">
                  <div className="detail-item">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{res.date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time Slot</span>
                    <span className="detail-value">{res.timeSlot}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Guests Booked</span>
                    <span className="detail-value">{res.guests} guests</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Reserved On</span>
                    <span className="detail-value" style={{ fontSize: '0.8rem' }}>
                      {new Date(res.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {res.status === 'confirmed' && (
                  <div className="reservation-actions">
                    <button
                      onClick={() => handleCancelReservation(res._id)}
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      Cancel Reservation
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
