import React, { memo, useState, useEffect, useRef } from 'react';
import { ComposableMap, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import { MICROSTATES } from '../../data/mapData';
import { TerritoryListPanel } from './TerritoryListPanel';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import { getFillColor, getRegionId } from '../../utils/mapUtils';
import { WORLD_GEO_URL } from '../../config/constants';
import { drilldownRegistry } from '../../config/drilldownConfig';
import { useMapAnimation } from '../../hooks/useMapAnimation';
import { useDrilldownGeography } from '../../hooks/useDrilldownGeography';
import { DrilldownControls } from './DrilldownControls';
import { MapGeographies } from './MapGeographies';
import { getSubRegionUrl } from '../../utils/topojsonCache';


interface StandardMapProps {
  setTooltipContent: (content: string) => void;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  highlightedCountry?: string | null;
  numericToA3: Record<string, string>;
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
}

const StandardMapBase: React.FC<StandardMapProps> = ({ 
  setTooltipContent, selectionMode, activeCountry, setActiveCountry, highlightedCountry, 
  numericToA3, showVisited, showWishlist, showAvoid 
}) => {
  const { places, setCountryStatus } = useStore();
  const [showTerritories, setShowTerritories] = useState(false);
  const worldTopoRef = useRef<any>(null);

  const { 
    mapCenter, setMapCenter, mapZoom, setMapZoom, 
    subRegionCenter, setSubRegionCenter, subRegionZoom, setSubRegionZoom, animateTo 
  } = useMapAnimation();

  const { geoData, isLoading } = useDrilldownGeography(activeCountry, setActiveCountry);

  // Pre-fetch and cache the world topology so we can compute centroids for search pan
  useEffect(() => {
    if (worldTopoRef.current) return;
    fetch(WORLD_GEO_URL)
      .then(r => r.json())
      .then(topo => { worldTopoRef.current = topo; })
      .catch(() => {});
  }, []);

  // Pan to searched country when highlightedCountry changes
  useEffect(() => {
    if (!highlightedCountry || activeCountry) return;

    const ms = MICROSTATES.find(m => m.id === highlightedCountry);
    if (ms) {
      animateTo(ms.coordinates[0], ms.coordinates[1], 6);
      return;
    }

    if (!worldTopoRef.current) {
      const t = setTimeout(() => {
        if (!worldTopoRef.current) return;
        tryPanToCountry(worldTopoRef.current, highlightedCountry);
      }, 300);
      return () => clearTimeout(t);
    }
    tryPanToCountry(worldTopoRef.current, highlightedCountry);
  }, [highlightedCountry, activeCountry, numericToA3, animateTo]);

  const tryPanToCountry = (topo: any, cca3: string) => {
    try {
      const features = (topojson.feature(topo, topo.objects.countries) as any).features;
      const found = features.find((f: any) => {
        const a3 = numericToA3[f.id] || f.id;
        return a3 === cca3;
      });
      if (found) {
        const center = geoCentroid(found);
        if (center && isFinite(center[0]) && isFinite(center[1])) {
          animateTo(center[0], center[1], 4);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!activeCountry) setShowTerritories(false);
  }, [activeCountry]);

  useEffect(() => {
    if (!highlightedCountry) animateTo(0, 0, 1);
  }, [highlightedCountry, animateTo]);

  const handleCountryClick = (geo: any) => {
    const countryId = getRegionId(geo, numericToA3, activeCountry);
    if (!countryId) return;

    const placeIdForStore = (activeCountry && !countryId.toString().startsWith(`${activeCountry}-`)) 
       ? `${activeCountry}-${countryId}` 
       : countryId;
    const currentStatus = places[placeIdForStore]?.status || 'NONE';
    
    if (currentStatus === selectionMode) {
      setCountryStatus(placeIdForStore, 'NONE');
    } else {
      setCountryStatus(placeIdForStore, selectionMode);
    }
  };

  const handleRightClick = (e: React.MouseEvent, geo: any) => {
    e.preventDefault();
    const countryId = getRegionId(geo, numericToA3, activeCountry);
    
    if (!countryId || activeCountry) return;

    if (getSubRegionUrl(countryId)) {
        setActiveCountry(countryId);
        // Look up the country's drilldown configuration to automatically set the proper zoom/center math
        const config = drilldownRegistry[countryId];
        if (config) {
            setSubRegionCenter(config.defaultView.center);
            setSubRegionZoom(config.defaultView.zoom);
        }
    } else {
        setTooltipContent(`No sub-regions available for ${geo.properties.name}`);
        setTimeout(() => setTooltipContent(''), 2000);
    }
  };

  const currentConfig = activeCountry ? drilldownRegistry[activeCountry] : null;

  return (
    <>
      {activeCountry && currentConfig && (
        <DrilldownControls 
          activeCountry={activeCountry}
          config={currentConfig}
          showTerritories={showTerritories}
          setShowTerritories={setShowTerritories}
          setActiveCountry={setActiveCountry}
          setSubRegionCenter={setSubRegionCenter}
          setSubRegionZoom={setSubRegionZoom}
        />
      )}

      {isLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 60, color: 'var(--text-secondary)' }}>
              Loading Sub-regions...
          </div>
      )}

      <ComposableMap 
        projection={currentConfig?.projection || "geoMercator"}
        projectionConfig={{ 
          scale: currentConfig ? currentConfig.scale : 147,
          center: currentConfig?.center || [0, 0],
        }}
        width={800}
        height={500}
        style={{ width: "100%", height: "100%", outline: 'none' }}
      >
        <ZoomableGroup 
          key={activeCountry || 'world'} 
          center={activeCountry ? subRegionCenter : mapCenter} 
          zoom={activeCountry ? subRegionZoom : mapZoom} 
          minZoom={0.5} 
          maxZoom={24} 
          onMoveEnd={({ coordinates, zoom }) => { 
            if (isFinite(coordinates[0]) && isFinite(coordinates[1])) { 
               if (activeCountry) {
                  setSubRegionCenter(coordinates);
                  setSubRegionZoom(zoom);
               } else {
                  setMapCenter(coordinates); 
                  setMapZoom(zoom); 
               }
            } 
          }}
        >
          <MapGeographies 
            geoData={geoData}
            activeCountry={activeCountry}
            highlightedCountry={highlightedCountry || null}
            numericToA3={numericToA3}
            places={places}
            selectionMode={selectionMode}
            showVisited={showVisited}
            showWishlist={showWishlist}
            showAvoid={showAvoid}
            setTooltipContent={setTooltipContent}
            handleCountryClick={handleCountryClick}
            handleRightClick={handleRightClick}
          />

          {!activeCountry && MICROSTATES.map((marker) => {
            const status = places[marker.id]?.status || 'NONE';
            const isHighlighted = highlightedCountry === marker.id;
            return (
              <Marker 
                key={marker.id} 
                coordinates={marker.coordinates as [number, number]}
                onClick={() => setCountryStatus(marker.id, status === selectionMode ? 'NONE' : selectionMode)}
                onMouseEnter={() => setTooltipContent(`${marker.name}${status !== 'NONE' ? ` - ${status}` : ''}`)}
                onMouseLeave={() => setTooltipContent('')}
              >
                <circle cx={0} cy={0} r={isHighlighted ? 4 : 2.5} fill={getFillColor(status, isHighlighted, false, showVisited, showWishlist, showAvoid)} stroke={isHighlighted ? "var(--accent-highlight)" : "var(--map-stroke)"} strokeWidth={0.5} style={{ cursor: 'pointer' }} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {currentConfig?.territories && showTerritories && (
        <TerritoryListPanel
          title={currentConfig.territoryLabel || 'Territories'}
          territories={currentConfig.territories}
          places={places}
          setCountryStatus={setCountryStatus}
          onClose={() => setShowTerritories(false)}
          getFillColor={getFillColor}
        />
      )}
    </>
  );
};

export const StandardMap = memo(StandardMapBase);
