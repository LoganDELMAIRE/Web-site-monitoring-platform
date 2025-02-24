import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMonitoringAuth } from '../monitoring/contexts/AuthContext';
import './navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useMonitoringAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/monitoring/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link to="/monitoring/home" className="nav-brand">
          <img src="/logo.svg" alt="Logo" className="brand-icon" />
          <span className="brand-text">Monitoring Websites</span>
        </Link>

        <button className="menu-toggle" onClick={toggleMenu}>
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
        </svg>
        </button>

        <div className={`nav-content ${isMenuOpen ? 'open' : ''}`}>
          <div className="nav-items">
            <Link 
              to="/monitoring/home" 
              className={`nav-item ${isActive('/monitoring/home') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>

            <Link 
              to="/monitoring/dashboard" 
              className={`nav-item ${isActive('/monitoring/dashboard') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            
            <Link 
              to="/monitoring/sites" 
              className={`nav-item ${isActive('/monitoring/sites') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Sites
            </Link>
          </div>
          
          <button 
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="nav-logout"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
