import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <nav className="navbar glass-panel">
      <NavLink to="/" className="navbar__brand">
        <Map className="navbar__brand-icon" size={24} />
        <span>VisitedPlaces</span>
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

        {/* Data Manager / Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="navbar__link navbar__action-btn"
          title="Settings"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};
