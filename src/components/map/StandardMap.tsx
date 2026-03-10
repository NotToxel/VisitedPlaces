import React, { memo, useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft, List } from 'lucide-react';
import { getSubRegionUrl } from '../../utils/topojsonCache';
import { MICROSTATES, UK_TERRITORIES, USA_TERRITORIES, OBSOLETE_UK_REGIONS } from '../../data/mapData';
import { TerritoryListPanel } from './TerritoryListPanel';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';



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

const getFillColor = (status: PlaceStatus, isHighlighted: boolean, isSubRegion = false, showVisited = true, showWishlist = true, showAvoid = true) => {
  if (isHighlighted) return '#fbbf24';
  if (status === 'VISITED' && showVisited) return 'var(--accent-visited)';
  if (status === 'WISHLIST' && showWishlist) return 'var(--accent-wishlist)';
  if (status === 'AVOID' && showAvoid) return '#ef4444';
  return isSubRegion ? 'var(--map-fill-hover)' : 'var(--map-fill-unselected)';
};

const getRegionId = (geo: any, numericToA3: Record<string, string>, activeCountry: string | null) => {
  if (activeCountry === 'GBR') {
     const rawId = geo.properties?.AREACD || geo.properties?.areacd || geo.id;
     return `GBR-${rawId}`;
  }
  if (activeCountry === 'USA') {
     return `USA-${geo.id}`;
  }
  const rawId = geo.properties?.ISO_A3 || geo.id;
  return numericToA3[rawId] || rawId;
};

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

const StandardMapBase: React.FC<StandardMapProps> = ({ setTooltipContent, selectionMode, activeCountry, setActiveCountry, highlightedCountry, numericToA3, showVisited, showWishlist, showAvoid }) => {
  const { places, setCountryStatus } = useStore();
  const [geoData, setGeoData] = useState<string | object>(worldGeoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerritories, setShowTerritories] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(1);
  const [subRegionCenter, setSubRegionCenter] = useState<[number, number]>([0, 0]);
  const [subRegionZoom, setSubRegionZoom] = useState(1);
  const worldTopoRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  // Tracks live values during animation
  const liveRef = useRef({ cx: 0, cy: 0, zoom: 1 });

  const animateTo = (targetCx: number, targetCy: number, targetZoom: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const step = () => {
      const live = liveRef.current;
      const factor = 0.1; // ease-out speed (0 = instant freeze, 1 = instant jump)
      live.cx += (targetCx - live.cx) * factor;
      live.cy += (targetCy - live.cy) * factor;
      live.zoom += (targetZoom - live.zoom) * factor;
      setMapCenter([live.cx, live.cy]);
      setMapZoom(live.zoom);
      const dx = Math.abs(targetCx - live.cx);
      const dy = Math.abs(targetCy - live.cy);
      const dz = Math.abs(targetZoom - live.zoom);
      if (dx > 0.01 || dy > 0.01 || dz > 0.005) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        // Snap to final values
        live.cx = targetCx; live.cy = targetCy; live.zoom = targetZoom;
        setMapCenter([targetCx, targetCy]);
        setMapZoom(targetZoom);
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  };

  // Cleanup animation on unmount
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  // Pre-fetch and cache the world topology so we can compute centroids for search pan
  useEffect(() => {
    if (worldTopoRef.current) return;
    fetch(worldGeoUrl)
      .then(r => r.json())
      .then(topo => { worldTopoRef.current = topo; })
      .catch(() => {});
  }, []);

  // Pan to searched country when highlightedCountry changes
  useEffect(() => {
    if (!highlightedCountry || activeCountry) return;

    // Try MICROSTATES first (they have known coordinates)
    const ms = MICROSTATES.find(m => m.id === highlightedCountry);
    if (ms) {
      animateTo(ms.coordinates[0], ms.coordinates[1], 6);
      return;
    }

    if (!worldTopoRef.current) {
      // Topology not yet loaded — wait 300ms and retry
      const t = setTimeout(() => {
        if (!worldTopoRef.current) return;
        const topo = worldTopoRef.current;
        tryPanToCountry(topo, highlightedCountry);
      }, 300);
      return () => clearTimeout(t);
    }
    tryPanToCountry(worldTopoRef.current, highlightedCountry);
  }, [highlightedCountry, activeCountry, numericToA3]);

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

  // Reset pan/zoom when search is cleared
  useEffect(() => {
    if (!highlightedCountry) {
      animateTo(0, 0, 1);
    }
  }, [highlightedCountry]);

  useEffect(() => {
    if (!activeCountry) {
        setGeoData(worldGeoUrl);
        setShowTerritories(false);
        return;
    }

    const subRegionUrl = getSubRegionUrl(activeCountry);
    if (!subRegionUrl) return;

    const controller = new AbortController();
    setIsLoading(true);
    fetch(subRegionUrl, { signal: controller.signal })
       .then(res => res.json())
       .then(data => {
           if (activeCountry === 'GBR' && data.objects && data.objects.utla) {
               data.objects.utla.geometries = data.objects.utla.geometries.filter((g: any) => {
                  const id = g.properties?.AREACD || g.properties?.areacd || g.id;
                  return !OBSOLETE_UK_REGIONS.has(id);
               });
               data.objects = { default: data.objects.utla };
           } else if (activeCountry === 'USA' && data.objects && data.objects.states) {
               data.objects = { default: data.objects.states };
           }
           setGeoData(data);
           setIsLoading(false);
       })
       .catch(err => {
           if (err.name === 'AbortError') return;
           setIsLoading(false);
           setActiveCountry(null);
           setGeoData(worldGeoUrl);
       });
       
    return () => controller.abort();
  }, [activeCountry, setActiveCountry]);

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
    console.log(`[StandardMap] Right-clicked geo:`, geo.properties?.name, `ID:`, countryId, `Active:`, activeCountry);
    
    if (!countryId || activeCountry) return;

    if (getSubRegionUrl(countryId)) {
        // MATCH ZOOM LOGIC:
        // Before we switch projections, we capture contemporary world-view coords & zoom 
        // to map them into the sub-region view.
        const currentCoordinates = [...mapCenter];
        const currentZoom = mapZoom;
        
        console.log(`[StandardMap] Transitioning to ${countryId}. Current World View:`, { currentCoordinates, currentZoom });
        
        setActiveCountry(countryId);
        
        // Isolate sub-region zoom state so we don't corrupt global mapCenter when roaming inside.
        if (countryId === 'USA') {
            const isZoomedIntoNA = currentCoordinates[0] < -50 && currentCoordinates[1] > 20;
            if (isZoomedIntoNA) {
                setSubRegionZoom(Math.min(3, Math.max(1, currentZoom / 3)));
            } else {
                setSubRegionZoom(1);
            }
            // geoAlbersUsa ALWAYS expects bounds around the US. 
            // Setting a wild center breaks the D3 projection bounds math and causes the distortion in the screenshot.
            setSubRegionCenter([-97, 38]);
        } else if (countryId === 'GBR') {
            const isZoomedIntoEurope = currentCoordinates[0] > -20 && currentCoordinates[0] < 40 && currentCoordinates[1] > 35;
            if (isZoomedIntoEurope) {
                const dx = currentCoordinates[0] - (-2);
                const dy = currentCoordinates[1] - 54.5;
                setSubRegionCenter([dx * 2, dy * 2]);
                setSubRegionZoom(Math.max(1, currentZoom / 4));
            } else {
                // If they enter from afar, center cleanly on the UK.
                setSubRegionCenter([-2, 54.5]);
                setSubRegionZoom(1);
            }
        }
    } else {
        setTooltipContent(`No sub-regions available for ${geo.properties.name}`);
        setTimeout(() => setTooltipContent(''), 2000);
    }
  };

  return (
    <>
      {activeCountry && (
         <button 
           onClick={() => setActiveCountry(null)}
           className="glass-button"
           style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50 }}
         >
             <ArrowLeft size={16} /> Back to World
         </button>
      )}

      {isLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 60, color: 'var(--text-secondary)' }}>
              Loading Sub-regions...
          </div>
      )}

      <ComposableMap 
        projection={activeCountry === 'USA' ? "geoAlbersUsa" : "geoMercator"}
        projectionConfig={{ 
          scale: activeCountry === 'USA' ? 800 : (activeCountry === 'GBR' ? 3200 : 147),
          center: activeCountry === 'GBR' ? [-2, 54.5] : (activeCountry === 'USA' ? undefined : [0, 0]),
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
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = getRegionId(geo, numericToA3, activeCountry);
                const placeIdForStore = (activeCountry && !countryId.toString().startsWith(`${activeCountry}-`)) 
                   ? `${activeCountry}-${countryId}` 
                   : countryId;
                const status = places[placeIdForStore]?.status || 'NONE';
                const isSelected = status !== 'NONE';
                const countryName = geo.properties?.AREANM || geo.properties?.areanm || geo.properties?.name || 'Unknown Region';
                
                const isHighlighted = !!highlightedCountry && (
                  highlightedCountry === (geo.properties?.ISO_A3 || geo.properties?.iso_a3 || geo.properties?.cca3) 
                  || highlightedCountry === countryId
                  || (geo.id && numericToA3[geo.id] && highlightedCountry === numericToA3[geo.id])
                );

                const fill = getFillColor(status, isHighlighted, !!activeCountry, showVisited, showWishlist, showAvoid);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setTooltipContent(`${countryName}${isSelected ? ` - ${status}` : ''}`)}
                    onMouseLeave={() => setTooltipContent('')}
                    onClick={() => handleCountryClick(geo)}
                    onContextMenu={(e) => handleRightClick(e, geo)}
                    fill={fill}
                    stroke={isHighlighted ? "#fbbf24" : 'var(--map-stroke)'}
                    strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.7 : 0.5)}
                    style={{
                      default: { fill, outline: 'none' },
                      hover: { fill, opacity: 0.75, outline: 'none', cursor: 'pointer' },
                      pressed: { fill: 'var(--accent-primary)', outline: 'none' }
                    }}
                  />
                );
              })
            }
          </Geographies>

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
                <circle cx={0} cy={0} r={isHighlighted ? 4 : 2.5} fill={getFillColor(status, isHighlighted, false, showVisited, showWishlist, showAvoid)} stroke={isHighlighted ? "#fbbf24" : "var(--map-stroke)"} strokeWidth={0.5} style={{ cursor: 'pointer' }} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {(activeCountry === 'GBR' || activeCountry === 'USA') && !showTerritories && (
        <button
          onClick={() => setShowTerritories(true)}
          className="glass-button"
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 40, padding: '0.6rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          <List size={18} /> {activeCountry === 'GBR' ? 'Overseas Territories' : 'US Territories'}
        </button>
      )}

      {activeCountry === 'GBR' && showTerritories && (
        <TerritoryListPanel
          title="Crown Dependencies & Overseas Territories"
          territories={UK_TERRITORIES}
          places={places}
          setCountryStatus={setCountryStatus}
          onClose={() => setShowTerritories(false)}
          getFillColor={getFillColor}
        />
      )}

      {activeCountry === 'USA' && showTerritories && (
        <TerritoryListPanel
          title="US Territories"
          territories={USA_TERRITORIES}
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
