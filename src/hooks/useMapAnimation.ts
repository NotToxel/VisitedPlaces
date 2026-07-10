import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Handles smooth requestAnimationFrame-based panning/iteration for a map view
 */
export function useMapAnimation(initialCenter: [number, number] = [0, 0], initialZoom: number = 1, isDrilldown: boolean = false) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [subRegionCenter, setSubRegionCenter] = useState<[number, number]>([0, 0]);
  const [subRegionZoom, setSubRegionZoom] = useState(1);

  const animFrameRef = useRef<number | null>(null);
  const liveRef = useRef({ cx: initialCenter[0], cy: initialCenter[1], zoom: initialZoom });

  // Sync liveRef with manual changes to prevent jumps on subsequent animations
  useEffect(() => {
    if (isDrilldown) {
      liveRef.current.cx = subRegionCenter[0];
      liveRef.current.cy = subRegionCenter[1];
      liveRef.current.zoom = subRegionZoom;
    } else {
      liveRef.current.cx = mapCenter[0];
      liveRef.current.cy = mapCenter[1];
      liveRef.current.zoom = mapZoom;
    }
  }, [mapCenter, mapZoom, subRegionCenter, subRegionZoom, isDrilldown]);

  const animateTo = useCallback((targetCx: number, targetCy: number, targetZoom: number, forceDrilldown?: boolean) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const targetIsDrill = forceDrilldown !== undefined ? forceDrilldown : isDrilldown;
    
    const step = () => {
      const live = liveRef.current;
      const factor = 0.1; // ease-out speed
      live.cx += (targetCx - live.cx) * factor;
      live.cy += (targetCy - live.cy) * factor;
      live.zoom += (targetZoom - live.zoom) * factor;
      
      if (targetIsDrill) {
        setSubRegionCenter([live.cx, live.cy]);
        setSubRegionZoom(live.zoom);
      } else {
        setMapCenter([live.cx, live.cy]);
        setMapZoom(live.zoom);
      }
      
      const dx = Math.abs(targetCx - live.cx);
      const dy = Math.abs(targetCy - live.cy);
      const dz = Math.abs(targetZoom - live.zoom);
      
      if (dx > 0.01 || dy > 0.01 || dz > 0.005) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        // Snap to final values
        live.cx = targetCx; live.cy = targetCy; live.zoom = targetZoom;
        if (targetIsDrill) {
          setSubRegionCenter([targetCx, targetCy]);
          setSubRegionZoom(targetZoom);
        } else {
          setMapCenter([targetCx, targetCy]);
          setMapZoom(targetZoom);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, [isDrilldown]);

  // Cleanup animation on unmount
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  return {
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    subRegionCenter,
    setSubRegionCenter,
    subRegionZoom,
    setSubRegionZoom,
    animateTo
  };
}
