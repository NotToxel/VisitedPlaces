import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const getLinkClass = (isActive: boolean) => 
    `px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all duration-200 select-none ${
      isActive 
        ? 'bg-primary text-white shadow-[0_2px_10px_rgba(122,162,247,0.25)] hover:bg-primary/95 scale-[1.02]' 
        : 'text-base-content/80 hover:text-primary hover:bg-base-300/20'
    }`;

  return (
    <nav className="w-full bg-base-200/45 backdrop-blur-md border-b border-base-300/35 py-3 sm:py-3.5 z-50 shadow-sm shrink-0 select-none">
      <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Left Column: Brand Logo (shifted inwards via container max-width) */}
        <div className="w-full sm:flex-1 flex justify-center sm:justify-start">
          <NavLink to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <Map className="w-5 h-5 text-primary" />
            <span className="font-extrabold text-md tracking-tight">
              <span className="text-base-content">Visited</span>
              <span className="text-primary">Places</span>
            </span>
          </NavLink>
        </div>

        {/* Center Column: Navigation Tabs */}
        <div className="w-full sm:flex-none flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <NavLink
              to="/"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <Map size={14} />
              <span>Map</span>
            </NavLink>
            <NavLink
              to="/list"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <List size={14} />
              <span>List</span>
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <BarChart3 size={14} />
              <span>Analytics</span>
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <Users size={14} />
              <span>Compare</span>
            </NavLink>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm text-base-content/80 hover:text-primary hover:bg-base-300/20 transition-all duration-200"
              title="Settings"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Spacer to balance centering on desktop */}
        <div className="hidden sm:flex sm:flex-1 justify-end" />
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};

