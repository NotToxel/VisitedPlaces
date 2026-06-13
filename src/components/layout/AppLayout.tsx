import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const AppLayout: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent text-base-content">
      <Navbar />
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
      <div 
        id="map-tooltip" 
        className="pointer-events-none fixed z-[100] rounded-lg bg-base-300/95 border border-base-300/60 text-base-content px-2.5 py-1.5 text-xs font-semibold shadow-2xl opacity-0 transition-opacity duration-150 backdrop-blur-md select-none" 
      />
      <footer className="footer bg-base-300/40 backdrop-blur-md text-base-content/70 py-2 px-4 border-t border-base-300/30 flex justify-between items-center text-xs shrink-0 select-none">
        <span>
          &copy; {currentYear} VisitedPlaces. Licensed under AGPL-3.0.
        </span>
        <span className="badge badge-sm badge-ghost opacity-40 hover:opacity-100 transition-opacity">v{__APP_VERSION__}</span>
      </footer>
    </div>
  );
};
