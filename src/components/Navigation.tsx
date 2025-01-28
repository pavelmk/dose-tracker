import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className="navigation">
      <Link 
        to="/" 
        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
      >
        Drug Plotter
      </Link>
      <Link 
        to="/birthday" 
        className={`nav-link ${location.pathname === '/birthday' ? 'active' : ''}`}
      >
        🎉 Neil's Birthday! 🎂
      </Link>
    </nav>
  );
};

export default Navigation;
