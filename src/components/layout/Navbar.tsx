import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="navbar glass-panel">
      <NavLink to="/" className="navbar__brand">
        <Map className="navbar__brand-icon" size={24} />
        VisitedPlaces
      </NavLink>

      <div className="navbar__links">
        <NavLink 
          to="/" 
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
        >
          <Map size={18} />
          <span>Map</span>
        </NavLink>
        <NavLink 
          to="/list" 
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
        >
          <List size={18} />
          <span>List</span>
        </NavLink>
        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Analytics</span>
        </NavLink>
        <NavLink 
          to="/compare" 
          className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}
        >
          <Users size={18} />
          <span>Compare</span>
        </NavLink>
      </div>
    </nav>
  );
};
