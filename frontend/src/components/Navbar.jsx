import React from 'react';
import { Utensils, LogOut, Shield, User } from 'lucide-react';

const Navbar = ({ user, logout, currentView, setView }) => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); if (user) setView('dashboard'); }}>
          <Utensils size={24} />
          <span>TableSync</span>
        </a>
        
        <div className="nav-menu">
          {user ? (
            <>
              <div className="nav-user">
                <User size={16} />
                <span>{user.name}</span>
                <span className={`badge badge-${user.role}`}>
                  {user.role === 'admin' && <Shield size={10} style={{ marginRight: '3px', display: 'inline' }} />}
                  {user.role}
                </span>
              </div>
              <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              {currentView === 'register' ? (
                <button onClick={() => setView('login')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                  Login
                </button>
              ) : (
                <button onClick={() => setView('register')} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                  Register
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
