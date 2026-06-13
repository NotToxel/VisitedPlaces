import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AppLayout } from './components/layout/AppLayout';
import Home from './pages/Home';
import List from './pages/List';
import Analytics from './pages/Analytics';
import Compare from './pages/Compare';

const App: React.FC = () => {
  const { theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
