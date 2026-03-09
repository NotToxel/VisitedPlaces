import React, { memo, useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { useStore } from '../../store/useStore';
import type { PlaceStatus } from '../../store/useStore';
import { ArrowLeft, Check, Heart, Ban, X as XIcon, List } from 'lucide-react';
import { getSubRegionUrl } from '../../utils/topojsonCache';
import { MICROSTATES, UK_TERRITORIES, OBSOLETE_UK_REGIONS } from '../../data/mapData';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';



interface StandardMapProps {
  setTooltipContent: (content: string) => void;
  selectionMode: 'VISITED' | 'WISHLIST' | 'AVOID';
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  highlightedCountry?: string | null;
  numericToA3: Record<string, string>;
}

const getFillColor = (status: PlaceStatus, isHighlighted: boolean, isSubRegion = false) => {
  if (isHighlighted) return '#fbbf24';
  if (status === 'VISITED') return 'var(--accent-visited)';
  if (status === 'WISHLIST') return 'var(--accent-wishlist)';
  if (status === 'AVOID') return '#ef4444';
  return isSubRegion ? 'var(--map-fill-hover)' : 'var(--map-fill-unselected)';
};

const getRegionId = (geo: any, numericToA3: Record<string, string>, activeCountry: string | null) => {
  if (activeCountry === 'GBR') {
     return geo.properties?.AREACD || geo.properties?.areacd || geo.id;
  }
  if (activeCountry === 'USA') {
     return geo.id;
  }
  const rawId = geo.properties?.ISO_A3 || geo.id;
  return numericToA3[rawId] || rawId;
};

const worldGeoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

const StandardMapBase: React.FC<StandardMapProps> = ({ setTooltipContent, selectionMode, activeCountry, setActiveCountry, highlightedCountry, numericToA3 }) => {
  const { places, setCountryStatus } = useStore();
  const [geoData, setGeoData] = useState<string | object>(worldGeoUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerritories, setShowTerritories] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(1);
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

    const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
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
          center: activeCountry === 'GBR' ? [-2, 54.5] : [0, 0]
        }}
        width={800}
        height={500}
        style={{ width: '100%', height: '100%', outline: 'none', opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}
      >
        <ZoomableGroup key={activeCountry || 'world'} center={mapCenter} zoom={mapZoom} minZoom={0.5} maxZoom={24} onMoveEnd={({ coordinates, zoom }) => { setMapCenter(coordinates); setMapZoom(zoom); }}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = getRegionId(geo, numericToA3, activeCountry);
                const placeIdForStore = activeCountry ? `${activeCountry}-${countryId}` : countryId;
                const status = places[placeIdForStore]?.status || 'NONE';
                const isSelected = status !== 'NONE';
                const countryName = geo.properties?.AREANM || geo.properties?.areanm || geo.properties?.name || 'Unknown Region';
                
                const isHighlighted = !!highlightedCountry && (
                  highlightedCountry === (geo.properties?.ISO_A3 || geo.properties?.iso_a3 || geo.properties?.cca3) 
                  || highlightedCountry === countryId
                  || (geo.id && numericToA3[geo.id] && highlightedCountry === numericToA3[geo.id])
                );

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setTooltipContent(`${countryName}${isSelected ? ` - ${status}` : ''}`)}
                    onMouseLeave={() => setTooltipContent('')}
                    onClick={() => handleCountryClick(geo)}
                    onContextMenu={(e) => handleRightClick(e, geo)}
                    fill={getFillColor(status, isHighlighted, !!activeCountry)}
                    stroke={isHighlighted ? "#fbbf24" : 'var(--map-stroke)'}
                    strokeWidth={isHighlighted ? 1.5 : (activeCountry ? 0.7 : 0.5)}
                    style={{
                      default: { fill: getFillColor(status, isHighlighted, !!activeCountry), outline: 'none' },
                      hover: { fill: getFillColor(status, isHighlighted, !!activeCountry), opacity: 0.75, outline: 'none', cursor: 'pointer' },
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
                <circle cx={0} cy={0} r={isHighlighted ? 4 : 2.5} fill={getFillColor(status, isHighlighted)} stroke={isHighlighted ? "#fff" : "var(--map-stroke)"} strokeWidth={0.5} style={{ cursor: 'pointer' }} />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {activeCountry === 'GBR' && !showTerritories && (
        <button
          onClick={() => setShowTerritories(true)}
          className="glass-button"
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 40, padding: '0.6rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          <List size={18} /> Overseas Territories
        </button>
      )}

      {activeCountry === 'GBR' && showTerritories && (
        <div className="glass-panel" style={{
          position: 'absolute', top: '1rem', right: '1rem', 
          width: 'min(380px, calc(100vw - 2rem))', 
          maxHeight: 'calc(100% - 2rem)', zIndex: 40,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.3s ease-out forwards'
        }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--map-fill-unselected)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Crown Dependencies & Overseas Territories
            </h3>
            <button 
              onClick={() => setShowTerritories(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
            >
              <XIcon size={18} />
            </button>
          </div>
          <div style={{ 
            flex: 1, overflowY: 'auto', padding: '0.5rem',
            display: 'flex', flexDirection: 'column',
            gap: '0.5rem', alignContent: 'start'
          }}>
            {UK_TERRITORIES.map((territory) => {
              const status = places[territory.id]?.status || 'NONE';
              return (
                <div key={territory.id} className="glass-panel" style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
                  borderStyle: 'solid', borderWidth: '1px',
                  transition: 'transform 0.2s, border-color 0.2s, background-color 0.2s',
                  borderColor: status === 'VISITED' ? 'var(--accent-visited)' : status === 'WISHLIST' ? 'var(--accent-wishlist)' : status === 'AVOID' ? '#ef4444' : 'var(--glass-border)',
                  background: status !== 'NONE' ? (status === 'VISITED' ? 'rgba(34,197,94,0.05)' : status === 'WISHLIST' ? 'rgba(187,154,247,0.05)' : 'rgba(239,68,68,0.05)') : 'rgba(255,255,255,0.02)'
                }}>
                  {territory.flagCode ? (
                    <img 
                      src={`https://flagcdn.com/24x18/${territory.flagCode}.png`} 
                      alt={`${territory.name} flag`}
                      style={{ width: '24px', height: '18px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}
                    />
                  ) : (
                    <div style={{ 
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                      background: getFillColor(status, false, true),
                      border: '1px solid var(--glass-border)'
                    }} />
                  )}
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {territory.name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      title="Mark Visited"
                      onClick={() => setCountryStatus(territory.id, status === 'VISITED' ? 'NONE' : 'VISITED')}
                      style={{ 
                        width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                        background: status === 'VISITED' ? 'var(--accent-visited)' : 'var(--glass-bg)',
                        color: status === 'VISITED' ? '#0b0c14' : 'var(--text-muted)',
                        transition: 'all 0.2s', padding: 0
                      }}
                    ><Check size={16} strokeWidth={status === 'VISITED' ? 3 : 2} /></button>
                    <button 
                      title="Mark Wishlist"
                      onClick={() => setCountryStatus(territory.id, status === 'WISHLIST' ? 'NONE' : 'WISHLIST')}
                      style={{ 
                        width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                        background: status === 'WISHLIST' ? 'var(--accent-wishlist)' : 'var(--glass-bg)',
                        color: status === 'WISHLIST' ? '#0b0c14' : 'var(--text-muted)',
                        transition: 'all 0.2s', padding: 0
                      }}
                    ><Heart size={16} strokeWidth={status === 'WISHLIST' ? 3 : 2} /></button>
                    <button 
                      title="Mark Avoid"
                      onClick={() => setCountryStatus(territory.id, status === 'AVOID' ? 'NONE' : 'AVOID')}
                      style={{ 
                        width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
                        background: status === 'AVOID' ? '#ef4444' : 'var(--glass-bg)',
                        color: status === 'AVOID' ? '#ffffff' : 'var(--text-muted)',
                        transition: 'all 0.2s', padding: 0
                      }}
                    ><Ban size={16} strokeWidth={status === 'AVOID' ? 3 : 2} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export const StandardMap = memo(StandardMapBase);
