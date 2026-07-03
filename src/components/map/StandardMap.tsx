import React, { memo, useEffect, useRef, useCallback } from 'react';
import { ComposableMap, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { MICROSTATES } from '../../data/mapData';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import { getFillColor, getRegionId, showMapTooltip, hideMapTooltip } from '../../utils/mapUtils';
import type { GeoFeature } from '../../utils/mapUtils';
import { WORLD_GEO_URL } from '../../config/constants';
import { drilldownRegistry } from '../../config/drilldownConfig';
import { useMapAnimation } from '../../hooks/useMapAnimation';
import { useDrilldownGeography } from '../../hooks/useDrilldownGeography';
import { DrilldownControls } from './DrilldownControls';
import { MapGeographies } from './MapGeographies';
import { fetchRawTopology } from '../../utils/topojsonCache';

interface StandardMapProps {
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  highlightedCountry?: string | null;
  numericToA3: Record<string, string>;
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  showRevisit: boolean;
  onCountryClick: (countryId: string, event: React.MouseEvent, displayName?: string) => void;
}

const COMPOSABLE_MAP_STYLE = { width: "100%", height: "100%", outline: 'none' };

const StandardMapBase: React.FC<StandardMapProps> = ({ 
  activeCountry, setActiveCountry, highlightedCountry, 
  numericToA3, showVisited, showWishlist, showAvoid, showRevisit,
  onCountryClick
}) => {
  const { places } = useStore();
  const worldTopoRef = useRef<unknown>(null);

  const { 
    mapCenter, setMapCenter, mapZoom, setMapZoom, 
    subRegionCenter, setSubRegionCenter, subRegionZoom, setSubRegionZoom, animateTo 
  } = useMapAnimation();

  const { geoData, isLoading } = useDrilldownGeography(activeCountry, setActiveCountry);

  // Pre-fetch and cache the world topology so we can compute centroids for search pan
  useEffect(() => {
    if (worldTopoRef.current) return;
    fetchRawTopology(WORLD_GEO_URL)
      .then(topo => { worldTopoRef.current = topo; })
      .catch(() => {});
  }, []);

  const tryPanToCountry = useCallback((topo: unknown, cca3: string) => {
    try {
      const topoData = topo as { objects?: { countries?: unknown } };
      if (!topoData || !topoData.objects || !topoData.objects.countries) return;
      const featureCollection = topojson.feature(
        topoData as unknown as Parameters<typeof topojson.feature>[0],
        topoData.objects.countries as unknown as Parameters<typeof topojson.feature>[1]
      ) as unknown as { features: { id?: string | number; [key: string]: unknown }[] };
      const features = featureCollection.features;
      const found = features.find((f) => {
        const idStr = f.id?.toString() || '';
        const a3 = numericToA3[idStr] || idStr;
        return a3 === cca3;
      });
      if (found) {
        const center = geoCentroid(found as unknown as Parameters<typeof geoCentroid>[0]);
        if (center && isFinite(center[0]) && isFinite(center[1])) {
          animateTo(center[0], center[1], 4);
        }
      }
    } catch (err) {
      console.warn('Could not pan to country', err);
    }
  }, [numericToA3, animateTo]);

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
  }, [highlightedCountry, activeCountry, tryPanToCountry, animateTo]);

  useEffect(() => {
    if (!highlightedCountry) animateTo(0, 0, 1);
  }, [highlightedCountry, animateTo]);

  const handleCountryClick = useCallback((geo: GeoFeature, event: React.MouseEvent, displayName?: string) => {
    const countryId = getRegionId(geo, numericToA3, activeCountry);
    if (!countryId) return;
    onCountryClick(countryId, event, displayName);
  }, [numericToA3, activeCountry, onCountryClick]);

  const handleMicrostateClick = useCallback((id: string, name: string, event: React.MouseEvent) => {
    onCountryClick(id, event, name);
  }, [onCountryClick]);

  const handleMoveEnd = useCallback(({ coordinates, zoom }: { coordinates: [number, number]; zoom: number }) => {
    if (isFinite(coordinates[0]) && isFinite(coordinates[1])) { 
       if (activeCountry) {
          setSubRegionCenter(coordinates);
          setSubRegionZoom(zoom);
       } else {
          setMapCenter(coordinates); 
          setMapZoom(zoom); 
       }
    } 
  }, [activeCountry, setSubRegionCenter, setSubRegionZoom, setMapCenter, setMapZoom]);

  const currentConfig = activeCountry ? drilldownRegistry[activeCountry] : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {activeCountry && currentConfig && (
        <DrilldownControls 
          config={currentConfig}
          setSubRegionCenter={setSubRegionCenter}
          setSubRegionZoom={setSubRegionZoom}
        />
      )}

      <ComposableMap 
        projection={currentConfig?.projection || "geoMercator"}
        projectionConfig={{ 
          scale: currentConfig ? currentConfig.scale : 147,
          center: currentConfig?.center || [0, 0],
        }}
        width={800}
        height={500}
        style={COMPOSABLE_MAP_STYLE}
      >
        <ZoomableGroup 
          key={activeCountry || 'world'} 
          center={activeCountry ? subRegionCenter : mapCenter} 
          zoom={activeCountry ? subRegionZoom : mapZoom} 
          minZoom={0.5} 
          maxZoom={24} 
          onMoveEnd={handleMoveEnd}
        >
          <MapGeographies 
            geoData={geoData}
            activeCountry={activeCountry}
            highlightedCountry={highlightedCountry || null}
            numericToA3={numericToA3}
            places={places}
            showVisited={showVisited}
            showWishlist={showWishlist}
            showAvoid={showAvoid}
            showRevisit={showRevisit}
            handleCountryClick={handleCountryClick}
          />

          {!activeCountry && !isLoading && MICROSTATES.map((marker) => {
            const status = places[marker.id]?.status || 'NONE';
            const isHighlighted = highlightedCountry === marker.id;
            return (
              <MicrostateMarker 
                key={marker.id} 
                marker={marker}
                status={status}
                isHighlighted={isHighlighted}
                showVisited={showVisited}
                showWishlist={showWishlist}
                showAvoid={showAvoid}
                showRevisit={showRevisit}
                onMarkerClick={handleMicrostateClick}
              />
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {isLoading && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <span>Loading Map Data...</span>
        </div>
      )}
    </div>
  );
};

interface MicrostateMarkerProps {
  marker: typeof MICROSTATES[number];
  status: PlaceStatus;
  isHighlighted: boolean;
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  showRevisit: boolean;
  onMarkerClick: (id: string, name: string, event: React.MouseEvent) => void;
}

const MicrostateMarkerBase: React.FC<MicrostateMarkerProps> = ({
  marker,
  status,
  isHighlighted,
  showVisited,
  showWishlist,
  showAvoid,
  showRevisit,
  onMarkerClick
}) => {
  return (
    <Marker coordinates={marker.coordinates as [number, number]}>
      <circle 
        cx={0} 
        cy={0} 
        r={isHighlighted ? 4 : 2.5} 
        fill={getFillColor(status, isHighlighted, false, showVisited, showWishlist, showAvoid, showRevisit)} 
        stroke={isHighlighted ? "var(--accent-highlight)" : "var(--map-stroke)"} 
        strokeWidth={0.5} 
        style={{ cursor: 'pointer' }} 
        onClick={(e) => onMarkerClick(marker.id, marker.name, e as unknown as React.MouseEvent)}
        onMouseEnter={(e) => showMapTooltip(`${marker.name}${status !== 'NONE' ? ` - ${status}` : ''}`, e)}
        onMouseMove={(e) => showMapTooltip(`${marker.name}${status !== 'NONE' ? ` - ${status}` : ''}`, e)}
        onMouseLeave={hideMapTooltip}
      />
    </Marker>
  );
};

const MicrostateMarker = memo(MicrostateMarkerBase);

export const StandardMap = memo(StandardMapBase);
