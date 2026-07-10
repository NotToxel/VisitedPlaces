import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { PageLoader } from './PageLoader';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent text-base-content">
      <Navbar />
      <main className="flex-1 overflow-hidden relative">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div 
        id="map-tooltip" 
        className="pointer-events-none fixed z-[100] rounded-lg bg-base-300/95 border border-base-300/60 text-base-content px-2.5 py-1.5 text-xs font-semibold shadow-2xl opacity-0 transition-opacity duration-150 backdrop-blur-md select-none" 
      />
    </div>
  );
};
