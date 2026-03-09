import React from 'react';
import { MapContainer } from '../components/map/MapContainer';

const Home: React.FC = () => {
  return (
    <div className="page-transition" style={{ height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      <MapContainer />
    </div>
  );
};

export default Home;
