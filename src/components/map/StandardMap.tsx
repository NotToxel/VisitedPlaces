import React, { memo, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useState } from 'react';
import { ComposableMap, ZoomableGroup, Marker } from 'react-simple-maps';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { MICROSTATES } from '../../data/mapData';
import { COUNTRIES } from '../../data/countries';
import * as topojson from 'topojson-client';
import { geoCentroid, geoBounds } from 'd3-geo';
import { getFillColor, getRegionId, showMapTooltip, hideMapTooltip, formatStatusLabel } from '../../utils/mapUtils';
import type { GeoFeature } from '../../utils/mapUtils';
import { WORLD_GEO_URL } from '../../config/urls';
import { drilldownRegistry } from '../../config/drilldownConfig';
import { useMapAnimation } from '../../hooks/useMapAnimation';
import { useDrilldownGeography } from '../../hooks/useDrilldownGeography';
import { DrilldownControls } from './DrilldownControls';
import { MapGeographies } from './MapGeographies';
import { fetchRawTopology, fetchWorldFeatureCollection } from '../../utils/topojsonCache';
import { getKosovoWorldFeature, getSomalilandWorldFeature, computeBoundingBox, getCountryGeoJSON, getPreloadedCountryDataSync, computeAutoScale } from '../../data/naturalEarthAdmin1';
import type { BBox } from '../../data/naturalEarthAdmin1';
import { getCountryFocusBBox } from '../../utils/countryFocus';

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
  pendingDrilldown?: string | null;
  onDrilldownReady?: (countryId: string) => void;
}

const COMPOSABLE_MAP_STYLE = { width: "100%", height: "100%", outline: 'none' };

const StandardMapBase: React.FC<StandardMapProps> = ({ 
  activeCountry, setActiveCountry, highlightedCountry, 
  numericToA3, showVisited, showWishlist, showAvoid, showRevisit,
  onCountryClick, pendingDrilldown, onDrilldownReady
}) => {
  const { places } = useStore();
  const worldTopoRef = useRef<unknown>(null);
  const [focusView, setFocusView] = useState<{ countryId: string; bbox: BBox } | null>(null);
  const [entryZoom, setEntryZoom] = useState<{ countryId: string; zoom: number } | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<{
    countryId: string;
    countryName: string;
  } | null>(null);

  const { 
    mapCenter, setMapCenter, mapZoom, setMapZoom, 
    subRegionCenter, setSubRegionCenter, subRegionZoom, setSubRegionZoom, resetSubRegionView, animateTo 
  } = useMapAnimation([0, 0], 1, !!activeCountry);

  const { geoData, isLoading, countryBBox } = useDrilldownGeography(activeCountry, setActiveCountry);
  const activeViewBBox = activeCountry && focusView?.countryId === activeCountry
    ? focusView.bbox : countryBBox;

  // Pre-fetch and cache the world topology so we can compute centroids for search pan
  useEffect(() => {
    if (activeCountry) return; // Delay world topology prefetch if inside a sub-region drilldown
    if (worldTopoRef.current) return;
    fetchRawTopology(WORLD_GEO_URL)
      .then(topo => { worldTopoRef.current = topo; })
      .catch(() => {});
  }, [activeCountry]);

  /**
   * Finds a country feature in the world topology and computes the center/zoom.
   * Returns { center, zoom } if found, or null.
   * Optionally calls animateTo with an onConverged callback.
   */
  const panToCountryWithCallback = useCallback((topo: unknown, cca3: string, onConverged?: () => void): void => {
    try {
      let found: unknown = null;
      if (cca3 === 'XKX') {
        found = getKosovoWorldFeature();
      } else if (cca3 === 'SOL') {
        found = getSomalilandWorldFeature();
      }

      if (!found && topo) {
        const topoData = topo as { objects?: { countries?: unknown } };
        if (topoData && topoData.objects && topoData.objects.countries) {
          const featureCollection = topojson.feature(
            topoData as unknown as Parameters<typeof topojson.feature>[0],
            topoData.objects.countries as unknown as Parameters<typeof topojson.feature>[1]
          ) as unknown as { features: { id?: string | number; [key: string]: unknown }[] };
          const features = featureCollection.features;
          found = features.find((f) => {
            const idStr = f.id?.toString() || '';
            const a3 = numericToA3[idStr] || idStr;
            return a3 === cca3;
          });
        }
      }
      if (found) {
        const center = geoCentroid(found as unknown as Parameters<typeof geoCentroid>[0]);
        const bounds = geoBounds(found as unknown as Parameters<typeof geoBounds>[0]);
        if (center && isFinite(center[0]) && isFinite(center[1])) {
          const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
          let targetZoom = 4;
          let targetLat = center[1];

          if (bounds && Array.isArray(bounds[0]) && Array.isArray(bounds[1])) {
            const lngSpan = Math.abs(bounds[1][0] - bounds[0][0]);
            const latSpan = Math.abs(bounds[1][1] - bounds[0][1]);
            const effectiveLngSpan = lngSpan > 180 ? 360 - lngSpan : lngSpan;
            const maxSpan = Math.max(effectiveLngSpan, latSpan, 0.5);

            const baseZoom = Math.min(Math.max(160 / maxSpan, 2.2), 10);
            targetZoom = isMobile ? Math.min(baseZoom * 1.35, 14) : baseZoom;
          } else {
            targetZoom = isMobile ? 5.5 : 4;
          }

          if (isMobile) {
            targetLat = center[1] - (10 / targetZoom);
          }

          animateTo(center[0], targetLat, targetZoom, undefined, onConverged);
        } else {
          onConverged?.();
        }
      } else {
        onConverged?.();
      }
    } catch (err) {
      console.warn('Could not pan to country', err);
      onConverged?.();
    }
  }, [numericToA3, animateTo]);

  // Backwards-compatible wrapper used by search highlighting (no callback needed)
  const tryPanToCountry = useCallback((topo: unknown, cca3: string) => {
    panToCountryWithCallback(topo, cca3);
  }, [panToCountryWithCallback]);

  const currentConfig = activeCountry ? drilldownRegistry[activeCountry] : null;

  const tryPanToRegion = useCallback((geo: unknown, regionId: string) => {
    try {
      if (!geo) return;
      let features: GeoFeature[] = [];
      const g = geo as { type?: string; features?: unknown[]; objects?: Record<string, unknown> };
      if (g.type === 'FeatureCollection' && Array.isArray(g.features)) {
        features = g.features as GeoFeature[];
      } else if (g.type === 'Topology' && g.objects) {
        const objectKey = Object.keys(g.objects)[0];
        if (objectKey) {
          const topoData = g as unknown as Parameters<typeof topojson.feature>[0];
          const topoObj = g.objects[objectKey] as Parameters<typeof topojson.feature>[1];
          const featureCollection = topojson.feature(topoData, topoObj) as unknown as { features: GeoFeature[] };
          if (featureCollection && Array.isArray(featureCollection.features)) {
            features = featureCollection.features;
          }
        }
      }

      // Compute duplicateIsos and duplicateNames for NE getRegionId matching
      const duplicateIsos = new Set<string>();
      const duplicateNames = new Set<string>();
      if (activeCountry) {
        const isoCounts: Record<string, number> = {};
        const nameCounts: Record<string, number> = {};
        features.forEach((f) => {
          const iso = f.properties?.iso_3166_2 || '';
          const name = f.properties?.name || '';
          if (iso) isoCounts[iso] = (isoCounts[iso] || 0) + 1;
          if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
        });
        for (const [iso, count] of Object.entries(isoCounts)) {
          if (count > 1) duplicateIsos.add(iso);
        }
        for (const [name, count] of Object.entries(nameCounts)) {
          if (count > 1) duplicateNames.add(name);
        }
      }

      const found = features.find((f) => {
        const countryId = getRegionId(
          f,
          numericToA3,
          activeCountry,
          duplicateIsos,
          duplicateNames
        );
        return countryId === regionId;
      });

      if (found) {
        const center = geoCentroid(found as unknown as Parameters<typeof geoCentroid>[0]);
        const bounds = geoBounds(found as unknown as Parameters<typeof geoBounds>[0]);
        if (center && isFinite(center[0]) && isFinite(center[1])) {
          const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
          let targetZoom = activeCountry === 'USA' ? 3 : 5;
          const targetLng = center[0];
          let targetLat = center[1];

          if (bounds && Array.isArray(bounds[0]) && Array.isArray(bounds[1])) {
            const lngSpan = Math.abs(bounds[1][0] - bounds[0][0]);
            const latSpan = Math.abs(bounds[1][1] - bounds[0][1]);
            const effectiveLngSpan = lngSpan > 180 ? 360 - lngSpan : lngSpan;
            const maxSpan = Math.max(effectiveLngSpan, latSpan, 0.2);

            const countrySpan = countryBBox ? Math.max(countryBBox.maxLng - countryBBox.minLng, countryBBox.maxLat - countryBBox.minLat, 1) : 10;
            const sizeRatio = Math.max(countrySpan / maxSpan, 1);
            const baseZoom = Math.min(Math.max(1.5 * Math.pow(sizeRatio, 0.45), 1.3), 4.5);
            targetZoom = isMobile ? Math.min(baseZoom * 1.25, 5.5) : baseZoom;
          } else if (isMobile) {
            targetZoom = targetZoom * 1.25;
          }

          if (isMobile) {
            targetLat = targetLat - (8 / targetZoom);
          }

          animateTo(targetLng, targetLat, targetZoom);
        }
      }
    } catch (err) {
      console.warn('Could not pan to region', err);
    }
  }, [activeCountry, countryBBox, numericToA3, animateTo]);

  // Pan to searched country/region when highlightedCountry changes
  useEffect(() => {
    if (!highlightedCountry) return;

    if (activeCountry) {
      tryPanToRegion(geoData, highlightedCountry);
      return;
    }

    const ms = MICROSTATES.find(m => m.id === highlightedCountry);
    if (ms) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const targetZoom = isMobile ? 8.5 : 6;
      const targetLat = isMobile ? ms.coordinates[1] - (6 / targetZoom) : ms.coordinates[1];
      animateTo(ms.coordinates[0], targetLat, targetZoom);
      return;
    }

    if (highlightedCountry === 'XKX') {
      tryPanToCountry(worldTopoRef.current, 'XKX');
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
  }, [highlightedCountry, activeCountry, geoData, tryPanToCountry, tryPanToRegion, animateTo]);

  const previousSearchRef = useRef({ highlightedCountry, activeCountry });
  useEffect(() => {
    const previous = previousSearchRef.current;
    previousSearchRef.current = { highlightedCountry, activeCountry };

    if (previous.activeCountry && !activeCountry) {
      animateTo(0, 0, 1, false);
    } else if (previous.activeCountry === activeCountry && previous.highlightedCountry && !highlightedCountry) {
      // Only a cleared search resets the camera. Entering a drill-down already
      // sets its final view; another animation here used to move it afterward.
      const config = activeCountry ? drilldownRegistry[activeCountry] : null;
      if (config) {
        animateTo(config.defaultView.center[0], config.defaultView.center[1], config.defaultView.zoom);
      } else if (activeViewBBox) {
        animateTo(activeViewBBox.centerLng, activeViewBBox.centerLat, 1);
      } else {
        animateTo(0, 0, 1);
      }
    }
  }, [highlightedCountry, activeCountry, activeViewBBox, animateTo]);

  const handleCountryClick = useCallback((countryId: string, event: React.MouseEvent, displayName?: string) => {
    if (!countryId) return;
    onCountryClick(countryId, event, displayName);
  }, [onCountryClick]);

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

  // Compute projection config: curated override or auto-computed from bounding box
  const { projectionScale, projectionCenter, projectionRotate, drilldownDefaultCenter, drilldownDefaultZoom } = useMemo(() => {
    if (currentConfig) {
      // Curated drill-down (USA, GBR)
      return {
        projectionScale: currentConfig.scale,
        projectionCenter: currentConfig.center || [0, 0] as [number, number],
        projectionRotate: undefined,
        drilldownDefaultCenter: currentConfig.defaultView.center,
        drilldownDefaultZoom: currentConfig.defaultView.zoom,
      };
    }
    if (activeCountry && activeViewBBox) {
      // NE-based drill-down — auto-compute scale from bounding box.
      // Uses Mercator-aware computation (accounts for latitude stretch).
      const autoScale = computeAutoScale(activeViewBBox);
      
      const centerLng = activeViewBBox.centerLng;
      const centerLat = activeViewBBox.centerLat;

      return {
        projectionScale: autoScale,
        projectionCenter: [0, centerLat] as [number, number],
        projectionRotate: [-centerLng, 0, 0] as [number, number, number],
        drilldownDefaultCenter: [centerLng, centerLat] as [number, number],
        drilldownDefaultZoom: 1,
      };
    }
    // World view
    return {
      projectionScale: 147,
      projectionCenter: [0, 0] as [number, number],
      projectionRotate: undefined,
      drilldownDefaultCenter: [0, 20] as [number, number],
      drilldownDefaultZoom: 1,
    };
  }, [currentConfig, activeCountry, activeViewBBox]);

  // Approach the same geographic center used by the drill-down projection.
  useEffect(() => {
    if (!pendingDrilldown || activeCountry) return;
    let isCancelled = false;

    async function runPhase1() {
      const countryId = pendingDrilldown!;
      const countryName = COUNTRIES.find((c) => c.id === countryId)?.name || countryId;
      const config = drilldownRegistry[countryId];

      // Show preloading badge if data is not yet in sync memory cache
      if (config || !getPreloadedCountryDataSync(countryId)) {
        setPreloadStatus({ countryId, countryName });
      }

      // Preload the same geography that the drill-down will render.
      const bbox = config ? null : await computeBoundingBox(countryId);
      if (config) {
        await fetchRawTopology(config.topoJsonUrl);
      } else if (bbox) {
        await getCountryGeoJSON(countryId);
      }

      if (isCancelled) return;

      if (!config && !bbox) {
        setPreloadStatus(null);
        onDrilldownReady?.(countryId);
        return;
      }

      setPreloadStatus(null);

      // The landing zoom uses the scale of the view that will render next.
      const view = bbox
        ? getCountryFocusBBox(countryId, await fetchWorldFeatureCollection(), bbox)
        : null;
      if (isCancelled) return;
      if (view) setFocusView({ countryId, bbox: view });
      const autoScale = config?.scale || computeAutoScale(view!);
      const targetWorldZoom = Math.min(Math.max(autoScale / 147, 1), 12);
      const targetCenter: [number, number] = config?.defaultView.center || [view!.centerLng, view!.centerLat];
      setEntryZoom({ countryId, zoom: (147 * targetWorldZoom) / autoScale });

      // 3. Pan world map to targetCenter at targetWorldZoom
      animateTo(targetCenter[0], targetCenter[1], targetWorldZoom, false, () => {
        if (isCancelled) return;
        resetSubRegionView(targetCenter, (147 * targetWorldZoom) / autoScale);
        onDrilldownReady?.(countryId);
      });
    }

    runPhase1();

    return () => {
      isCancelled = true;
      setPreloadStatus(null);
    };
  }, [pendingDrilldown, activeCountry, animateTo, resetSubRegionView, onDrilldownReady]);

  // Place the regional geography at the world zoom's landing view before paint.
  useLayoutEffect(() => {
    if (activeCountry && !isLoading && (currentConfig || activeViewBBox)) {
      const initialZoom = entryZoom?.countryId === activeCountry ? entryZoom.zoom : drilldownDefaultZoom;
      resetSubRegionView(drilldownDefaultCenter, initialZoom);
      if (Math.abs(initialZoom - drilldownDefaultZoom) > 0.001) {
        const frame = requestAnimationFrame(() => {
          animateTo(drilldownDefaultCenter[0], drilldownDefaultCenter[1], drilldownDefaultZoom, true);
        });
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [activeCountry, currentConfig, activeViewBBox, entryZoom, isLoading, drilldownDefaultCenter, drilldownDefaultZoom, resetSubRegionView, animateTo]);

  return (
    <div className={`standard-map-wrapper ${activeCountry ? 'standard-map-wrapper--drilldown' : ''}`} style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {activeCountry ? (
        <DrilldownControls 
          config={currentConfig}
          defaultCenter={drilldownDefaultCenter}
          defaultZoom={drilldownDefaultZoom}
          setSubRegionCenter={setSubRegionCenter}
          setSubRegionZoom={setSubRegionZoom}
        />
      ) : (
        <button 
          onClick={() => {
            setMapCenter([0, 20]);
            setMapZoom(1);
          }}
          className="map-reset-zoom"
          title="Reset Map Zoom"
          aria-label="Reset map zoom"
        >
          <RefreshCw size={12} />
          <span>Reset Zoom</span>
        </button>
      )}

      <ComposableMap 
        projection={"geoMercator"}
        projectionConfig={{ 
          scale: projectionScale,
          center: projectionCenter,
          rotate: projectionRotate,
        }}
        width={800}
        height={500}
        style={COMPOSABLE_MAP_STYLE}
      >
        <ZoomableGroup 
          key={activeCountry || 'world'} 
          center={activeCountry ? subRegionCenter : mapCenter} 
          zoom={activeCountry ? subRegionZoom : mapZoom} 
          minZoom={0.3} 
          maxZoom={24} 
          onMoveEnd={handleMoveEnd}
          translateExtent={[[-400, -250], [1200, 750]]}
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

      {preloadStatus && (
        <div className="map-preload-badge">
          <Loader2 size={14} className="animate-spin text-amber-400" />
          <span>Loading {preloadStatus.countryName} sub-regions...</span>
        </div>
      )}

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
        onMouseEnter={(e) => showMapTooltip(`${marker.name}${status !== 'NONE' ? ` - ${formatStatusLabel(status)}` : ''}`, e)}
        onMouseMove={(e) => showMapTooltip(`${marker.name}${status !== 'NONE' ? ` - ${formatStatusLabel(status)}` : ''}`, e)}
        onMouseLeave={hideMapTooltip}
      />
    </Marker>
  );
};

const MicrostateMarker = memo(MicrostateMarkerBase);

export const StandardMap = memo(StandardMapBase);
