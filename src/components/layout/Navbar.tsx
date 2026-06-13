import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings, Lock } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const getLinkClass = (isActive: boolean) => 
    `btn btn-xs h-7.5 px-3.5 rounded-full flex items-center gap-1.5 font-bold transition-all border-none ${
      isActive 
        ? 'bg-primary text-white shadow-[0_2px_10px_rgba(122,162,247,0.35)] hover:bg-primary/95 scale-105 animate-pulse-subtle' 
        : 'btn-ghost text-base-content/80 hover:text-primary hover:bg-base-300/20'
    }`;

  return (
    <nav className="mx-auto mt-3.5 max-w-5xl w-[95%] rounded-full bg-base-200/45 backdrop-blur-md border border-base-300/35 px-4.5 py-2 z-50 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 shadow-md shrink-0 select-none">
      
      {/* Left Column: Logo / Home Button */}
      <div className="w-full md:flex-1 flex justify-center md:justify-start">
        <NavLink to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
          <Map className="w-5 h-5 text-primary" />
          <span className="font-extrabold text-md tracking-tight">
            <span className="text-base-content">Visited</span>
            <span className="text-primary">Places</span>
          </span>
        </NavLink>
      </div>

      {/* Center Column: Navigation Tabs & Settings grouped in a pill container */}
      <div className="w-full md:flex-none flex flex-wrap justify-center items-center gap-1 bg-base-300/10 border border-base-300/25 p-1 rounded-full">
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
          className="btn btn-ghost btn-xs h-7.5 px-3 rounded-full flex items-center gap-1.5 font-bold text-base-content/80 hover:text-primary transition-all"
          title="Settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>

      {/* Right Column: 100% Offline Badge to balance centering */}
      <div className="w-full md:flex-1 flex justify-center md:justify-end">
        <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold select-none shrink-0 shadow-sm shadow-emerald-500/5">
          <Lock size={10} className="stroke-[3]" />
          <span>100% Offline</span>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </nav>
  );
};
