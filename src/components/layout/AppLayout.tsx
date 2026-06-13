import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const AppLayout: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span className="app-footer__copyright">
          &copy; {currentYear} VisitedPlaces. Licensed under AGPL-3.0.
        </span>
        <span className="app-footer__version">v{__APP_VERSION__}</span>
      </footer>
    </div>
  );
};
