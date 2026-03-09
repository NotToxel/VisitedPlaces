import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings, Sun, Moon } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { useStore } from '../../store/useStore';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const { theme, toggleTheme } = useStore();

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

        {/* Theme Toggle — always visible in Navbar */}
        <button
          onClick={toggleTheme}
          className="navbar__link"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: theme === 'dark' ? '#f0a500' : '#3b82f6',
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Data Manager / Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="navbar__link"
          title="Data Manager — Import / Export"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
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
