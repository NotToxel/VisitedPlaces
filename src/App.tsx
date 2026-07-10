import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppLayout } from './components/layout/AppLayout';
import { prefetchNaturalEarth } from './data/naturalEarthAdmin1';
const Home = React.lazy(() => import('./pages/Home'));
const List = React.lazy(() => import('./pages/List'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Compare = React.lazy(() => import('./pages/Compare'));

const App: React.FC = () => {
  const { theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Prefetch Natural Earth admin-1 sub-regions data on app start
    prefetchNaturalEarth().then((success) => {
      if (success) {
        useStore.getState().setNeDataLoaded(true);
      }
    });
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="list" element={<List />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
