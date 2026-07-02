import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'register', 'dashboard'
  const [loading, setLoading] = useState(true);

  // Fetch API URL from environmental vars
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Load session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setView('dashboard');
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Save auth details
  const setAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Clear auth details (logout)
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfbf7', fontFamily: 'Outfit, sans-serif' }}>
        <p style={{ color: '#4a3319', fontWeight: 600, fontSize: '1.2rem' }}>Loading TableSync...</p>
      </div>
    );
  }

  // Auth Guards & Redirect Logic
  let activePage;
  if (token && user) {
    // Authenticated Users
    if (view === 'login' || view === 'register') {
      // Redirect authenticated users to dashboard
      setView('dashboard');
    }
    
    if (user.role === 'admin') {
      activePage = <AdminDashboard token={token} apiUrl={apiUrl} />;
    } else {
      activePage = <CustomerDashboard token={token} user={user} apiUrl={apiUrl} />;
    }
  } else {
    // Unauthenticated Users
    if (view !== 'login' && view !== 'register') {
      // Guard redirect to login if attempting dashboard
      setView('login');
    }
    
    if (view === 'register') {
      activePage = <Register setAuth={setAuth} setView={setView} apiUrl={apiUrl} />;
    } else {
      activePage = <Login setAuth={setAuth} setView={setView} apiUrl={apiUrl} />;
    }
  }

  return (
    <div className="app-container">
      <Navbar user={user} logout={logout} currentView={view} setView={setView} />
      <main className="main-content">
        {activePage}
      </main>
    </div>
  );
};

export default App;
