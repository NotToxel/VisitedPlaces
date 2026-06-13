import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const getLinkClass = (isActive: boolean) => 
    `btn btn-ghost btn-sm flex items-center gap-1.5 font-medium transition-colors ${
      isActive ? 'btn-active text-primary bg-primary/10' : 'text-base-content/80 hover:text-primary'
    }`;

  return (
    <nav className="navbar bg-base-200/80 backdrop-blur-md border-b border-base-300/50 justify-between px-4 py-2 shrink-0 select-none z-50">
      <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-primary hover:opacity-85 transition-opacity">
        <Map className="w-5 h-5" />
        <span>VisitedPlaces</span>
      </NavLink>

      <div className="flex items-center gap-1 md:gap-2">
        <NavLink
          to="/"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <Map size={16} />
          <span className="hidden sm:inline">Map</span>
        </NavLink>
        <NavLink
          to="/list"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <List size={16} />
          <span className="hidden sm:inline">List</span>
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <BarChart3 size={16} />
          <span className="hidden sm:inline">Analytics</span>
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <Users size={16} />
          <span className="hidden sm:inline">Compare</span>
        </NavLink>

        {/* Data Manager / Settings */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-ghost btn-sm flex items-center gap-1.5 font-medium text-base-content/80 hover:text-primary transition-colors"
          title="Settings"
        >
          <Settings size={16} />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};
