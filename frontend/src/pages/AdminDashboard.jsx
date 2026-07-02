import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Plus, X, Trash2, Edit3, Filter, ShieldAlert, Check, RefreshCw } from 'lucide-react';

const AdminDashboard = ({ token, apiUrl }) => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filterDate, setFilterDate] = useState('');
  
  // Add Table state
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCap, setNewTableCap] = useState('');
  
  // Edit Reservation Modal state
  const [editingRes, setEditingRes] = useState(null);
  const [modalDate, setModalDate] = useState('');
  const [modalSlot, setModalSlot] = useState('');
  const [modalGuests, setModalGuests] = useState(2);
  const [modalTable, setModalTable] = useState('');
  const [modalStatus, setModalStatus] = useState('');
  const [modalTablesList, setModalTablesList] = useState([]);
  const [modalLoadingTables, setModalLoadingTables] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Status & Error feed
  const [feedError, setFeedError] = useState('');
  const [feedSuccess, setFeedSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setFeedError('');
    try {
      // Get Tables
      const tablesRes = await fetch(`${apiUrl}/api/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tablesData = await tablesRes.json();
      if (tablesRes.ok) {
        setTables(tablesData.data);
      }

      // Get Reservations
      let resUrl = `${apiUrl}/api/reservations`;
      if (filterDate) {
        resUrl += `?date=${filterDate}`;
      }
      const resRes = await fetch(resUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await resRes.json();
      if (resRes.ok) {
        setReservations(resData.data);
      }
    } catch (err) {
      setFeedError('Network error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, filterDate]);

  // Handle Add Table
  const handleAddTable = async (e) => {
    e.preventDefault();
    setFeedError('');
    setFeedSuccess('');
    
    const tableNum = parseInt(newTableNum, 10);
    const capacity = parseInt(newTableCap, 10);

    if (!tableNum || !capacity) {
      setFeedError('Please enter valid table number and seating capacity');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tableNumber: tableNum, capacity })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add table');
      }

      setFeedSuccess(`Table ${tableNum} with capacity ${capacity} successfully added.`);
      setNewTableNum('');
      setNewTableCap('');
      fetchData();
    } catch (err) {
      setFeedError(err.message);
    }
  };

  // Handle Delete Table
  const handleDeleteTable = async (id, num) => {
    if (!window.confirm(`Are you sure you want to delete Table ${num}? This cannot be undone.`)) {
      return;
    }
    setFeedError('');
    setFeedSuccess('');

    try {
      const response = await fetch(`${apiUrl}/api/tables/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete table');
      }

      setFeedSuccess(`Table ${num} deleted successfully.`);
      fetchData();
    } catch (err) {
      setFeedError(err.message);
    }
  };

  // Handle Cancel Reservation (Admin Override)
  const handleCancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }
    setFeedError('');
    setFeedSuccess('');

    try {
      const response = await fetch(`${apiUrl}/api/reservations/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel reservation');
      }

      setFeedSuccess('Reservation cancelled successfully.');
      fetchData();
    } catch (err) {
      setFeedError(err.message);
    }
  };

  // Open Modal and pre-load options
  const openEditModal = async (resObj) => {
    setEditingRes(resObj);
    setModalDate(resObj.date);
    setModalSlot(resObj.timeSlot);
    setModalGuests(resObj.guests);
    setModalTable(resObj.table?._id || '');
    setModalStatus(resObj.status);
    setModalError('');
    
    // Load available tables for this date, time and guests (plus include current table)
    setModalLoadingTables(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/reservations/availability?date=${resObj.date}&timeSlot=${resObj.timeSlot}&guests=${resObj.guests}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        // We must ensure the currently assigned table is in the list, even if it is currently booked
        const list = [...data.data];
        if (resObj.table && !list.some(t => t._id === resObj.table._id)) {
          list.push(resObj.table);
        }
        setModalTablesList(list);
      }
    } catch (err) {
      setModalError('Failed to fetch available tables for modification');
    } finally {
      setModalLoadingTables(false);
    }
  };

  // Load tables list on Modal Form updates dynamically
  useEffect(() => {
    if (!editingRes || !modalDate || !modalSlot) return;
    
    const fetchModalTables = async () => {
      setModalLoadingTables(true);
      try {
        const response = await fetch(
          `${apiUrl}/api/reservations/availability?date=${modalDate}&timeSlot=${modalSlot}&guests=${modalGuests}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        if (response.ok) {
          const list = [...data.data];
          // If the date/slot matches the original reservation's original values, include its original table
          if (modalDate === editingRes.date && modalSlot === editingRes.timeSlot && editingRes.table) {
            if (!list.some(t => t._id === editingRes.table._id)) {
              list.push(editingRes.table);
            }
          }
          setModalTablesList(list);
          
          // If current selected table is not in the new available list, set selection to the first available one
          if (list.length > 0 && !list.some(t => t._id === modalTable)) {
            setModalTable(list[0]._id);
          } else if (list.length === 0) {
            setModalTable('');
          }
        }
      } catch (err) {
        setModalError('Failed to check available tables on date change');
      } finally {
        setModalLoadingTables(false);
      }
    };

    fetchModalTables();
  }, [modalDate, modalSlot, modalGuests]);

  // Handle Save edits
  const handleSaveEdits = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSaving(true);

    try {
      const response = await fetch(`${apiUrl}/api/reservations/${editingRes._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: modalDate,
          timeSlot: modalSlot,
          guests: parseInt(modalGuests, 10),
          table: modalTable || undefined,
          status: modalStatus
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reservation');
      }

      setFeedSuccess('Reservation updated successfully.');
      setEditingRes(null);
      fetchData();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tabs Selector Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('reservations')}
          className="text-link"
          style={{
            background: 'none',
            border: 'none',
            paddingBottom: '0.75rem',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1.1rem',
            borderBottom: activeTab === 'reservations' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'reservations' ? 'var(--primary-color)' : 'var(--text-light)',
            cursor: 'pointer'
          }}
        >
          Manage Reservations
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className="text-link"
          style={{
            background: 'none',
            border: 'none',
            paddingBottom: '0.75rem',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1.1rem',
            borderBottom: activeTab === 'tables' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'tables' ? 'var(--primary-color)' : 'var(--text-light)',
            cursor: 'pointer'
          }}
        >
          Manage Tables
        </button>
      </div>

      {feedSuccess && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{feedSuccess}</span>
        </div>
      )}

      {feedError && (
        <div className="alert alert-error">
          <ShieldAlert size={18} />
          <span>{feedError}</span>
        </div>
      )}

      {/* Tab: Reservations */}
      {activeTab === 'reservations' && (
        <div className="dashboard-section">
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <h3 className="section-title">All Reservations</h3>
            <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Admin Date Filters */}
          <div className="admin-filters">
            <div className="filter-group">
              <label className="form-label" style={{ fontSize: '0.8rem' }}>
                <Filter size={10} style={{ marginRight: '5px' }} />
                Filter by Date
              </label>
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1rem' }}
              >
                Clear Filter
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-light)', textAlign: 'center' }}>Loading reservation logs...</p>
          ) : reservations.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} className="empty-icon" />
              <p>No reservations found.</p>
              {filterDate && <p style={{ fontSize: '0.85rem' }}>Try clearing the date filter to see all bookings.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {reservations.map((res) => (
                <div
                  key={res._id}
                  className={`reservation-card ${res.status === 'cancelled' ? 'cancelled' : 'confirmed'}`}
                >
                  <div className="reservation-header">
                    <div>
                      <h4 className="reservation-title">Table {res.table?.tableNumber || 'N/A'}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        Capacity: {res.table?.capacity || 0} guests
                      </span>
                    </div>
                    <span className={`reservation-status status-${res.status}`}>
                      {res.status}
                    </span>
                  </div>

                  {/* Customer context */}
                  <div style={{ backgroundColor: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Customer Info</p>
                    <p style={{ color: 'var(--text-dark)' }}>{res.user?.name || 'Unknown'}</p>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>{res.user?.email || 'Unknown'}</p>
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
                      <span className="detail-label">Booked At</span>
                      <span className="detail-value" style={{ fontSize: '0.75rem' }}>
                        {new Date(res.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="reservation-actions">
                    <button
                      onClick={() => openEditModal(res)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                    {res.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelReservation(res._id)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Tables */}
      {activeTab === 'tables' && (
        <div className="dashboard-grid">
          {/* Add Table card */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Add Restaurant Table</h3>
            </div>
            <div className="card">
              <form onSubmit={handleAddTable}>
                <div className="form-group">
                  <label className="form-label">Table Number</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 9"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Seating Capacity</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 4"
                    min="1"
                    max="20"
                    value={newTableCap}
                    onChange={(e) => setNewTableCap(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  <Plus size={16} />
                  Add Table
                </button>
              </form>
            </div>
          </div>

          {/* Tables layout Grid */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Restaurant Floor Plan</h3>
            </div>
            {loading ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center' }}>Loading restaurant plan...</p>
            ) : tables.length === 0 ? (
              <div className="empty-state">
                <Users size={48} className="empty-icon" />
                <p>No tables configured.</p>
                <p style={{ fontSize: '0.85rem' }}>Create tables using the form on the left.</p>
              </div>
            ) : (
              <div className="table-grid">
                {tables.map((t) => (
                  <div key={t._id} className="table-card">
                    <div className="table-number">Table {t.tableNumber}</div>
                    <div className="table-capacity">Fits {t.capacity} guests</div>
                    <button
                      onClick={() => handleDeleteTable(t._id, t.tableNumber)}
                      className="table-delete-btn"
                      title="Remove Table"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Edit Modal Overlay */}
      {editingRes && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="section-title" style={{ margin: 0 }}>Edit Reservation</h3>
              <button onClick={() => setEditingRes(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-error">
                <ShieldAlert size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdits}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time Slot</label>
                <select
                  className="form-control"
                  value={modalSlot}
                  onChange={(e) => setModalSlot(e.target.value)}
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
                <label className="form-label">Guests</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="8"
                  value={modalGuests}
                  onChange={(e) => setModalGuests(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Assigned Table {modalLoadingTables && '(checking availability...)'}
                </label>
                <select
                  className="form-control"
                  value={modalTable}
                  onChange={(e) => setModalTable(e.target.value)}
                  required
                  disabled={modalLoadingTables || modalTablesList.length === 0}
                >
                  {modalTablesList.length === 0 ? (
                    <option value="">No tables available for this date/capacity</option>
                  ) : (
                    modalTablesList.map((t) => (
                      <option key={t._id} value={t._id}>
                        Table {t.tableNumber} (Capacity: {t.capacity}) {editingRes.table?._id === t._id && '[Current]'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reservation Status</label>
                <select
                  className="form-control"
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  required
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled (soft-delete)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingRes(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalSaving || modalLoadingTables || modalTablesList.length === 0}
                >
                  {modalSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
