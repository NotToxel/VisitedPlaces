import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const getLinkClass = (isActive: boolean) => 
    `px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold text-sm transition-all duration-200 select-none ${
      isActive 
        ? 'bg-primary text-white shadow-[0_2px_10px_rgba(122,162,247,0.25)] hover:bg-primary/95 scale-[1.02]' 
        : 'text-base-content/80 hover:text-primary hover:bg-base-300/20'
    }`;

  return (
    <nav className="w-full bg-base-200/45 backdrop-blur-md border-b border-base-300/35 py-3 sm:py-3.5 z-50 shadow-sm shrink-0 select-none">
      <div className="max-w-5xl mx-auto px-6 md:px-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        
        {/* Mobile-only Brand Logo (stacked, centered) */}
        <div className="flex sm:hidden items-center justify-center w-full">
          <NavLink to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
            <Map className="w-5 h-5 text-primary" />
            <span className="font-extrabold text-md tracking-tight">
              <span className="text-base-content">Visited</span>
              <span className="text-primary">Places</span>
            </span>
          </NavLink>
        </div>

        {/* Navigation Wrapper (centered in the page layout) */}
        <div className="relative flex flex-wrap items-center justify-center gap-2 md:gap-3">
          
          {/* Desktop-only Brand Logo (positioned just off-center to the left, relative to tabs) */}
          <div className="hidden sm:flex sm:absolute sm:right-full sm:mr-8 md:mr-12 lg:mr-16 items-center shrink-0">
            <NavLink to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
              <Map className="w-5 h-5 text-primary" />
              <span className="font-extrabold text-md tracking-tight">
                <span className="text-base-content">Visited</span>
                <span className="text-primary">Places</span>
              </span>
            </NavLink>
          </div>

          {/* Navigation Tabs */}
          <NavLink
            to="/"
            className={({ isActive }) => getLinkClass(isActive)}
            title="Map"
          >
            <Map size={14} />
            <span className="hidden sm:inline">Map</span>
          </NavLink>
          <NavLink
            to="/list"
            className={({ isActive }) => getLinkClass(isActive)}
            title="List"
          >
            <List size={14} />
            <span className="hidden sm:inline">List</span>
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) => getLinkClass(isActive)}
            title="Analytics"
          >
            <BarChart3 size={14} />
            <span className="hidden sm:inline">Analytics</span>
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) => getLinkClass(isActive)}
            title="Compare"
          >
            <Users size={14} />
            <span className="hidden sm:inline">Compare</span>
          </NavLink>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold text-sm text-base-content/80 hover:text-primary hover:bg-base-300/20 transition-all duration-200"
            title="Settings"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};

