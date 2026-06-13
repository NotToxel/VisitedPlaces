import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const getLinkClass = (isActive: boolean) => 
    `btn btn-ghost btn-sm flex items-center gap-1.5 font-semibold transition-colors ${
      isActive ? 'btn-active text-primary bg-primary/10' : 'text-base-content/80 hover:text-primary'
    }`;

  return (
    <nav className="navbar bg-base-200/45 backdrop-blur-md border-b border-base-300/35 px-4 py-2 shrink-0 select-none z-50 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
      
      {/* Left Column: Logo / Home Button */}
      <div className="w-full md:flex-1 flex justify-center md:justify-start">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-primary hover:opacity-85 transition-opacity">
          <Map className="w-5 h-5 text-primary" />
          <span>VisitedPlaces</span>
        </NavLink>
      </div>

      {/* Center Column: Centered Tabs (including Settings) */}
      <div className="w-full md:flex-none flex flex-wrap justify-center items-center gap-1 md:gap-2">
        <NavLink
          to="/"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <Map size={15} />
          <span>Map</span>
        </NavLink>
        <NavLink
          to="/list"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <List size={15} />
          <span>List</span>
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <BarChart3 size={15} />
          <span>Analytics</span>
        </NavLink>
        <NavLink
          to="/compare"
          className={({ isActive }) => getLinkClass(isActive)}
        >
          <Users size={15} />
          <span>Compare</span>
        </NavLink>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-ghost btn-sm flex items-center gap-1.5 font-semibold text-base-content/80 hover:text-primary transition-colors"
          title="Settings"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>

      {/* Right Column: Empty spacer to mathematically balance centered tabs on desktop */}
      <div className="hidden md:flex md:flex-1 justify-end" />

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};
