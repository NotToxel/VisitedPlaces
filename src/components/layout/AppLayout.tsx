import React, { Suspense, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { PageLoader } from './PageLoader';
import { hideMapTooltip } from '../../utils/mapUtils';

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    hideMapTooltip();
  }, [pathname]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full overflow-hidden bg-transparent text-base-content">
      <Navbar />
      <main className="flex-1 overflow-hidden relative">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <div 
        id="map-tooltip" 
        className="map-tooltip pointer-events-none fixed z-[100] opacity-0 transition-opacity duration-150 select-none"
      />
    </div>
  );
};
