import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Handles smooth requestAnimationFrame-based panning/iteration for a map view.
 *
 * Key design decisions to prevent infinite React re-render loops:
 * - If the live position is already at the target, we skip scheduling any RAF at all.
 * - setState is called at most ONCE per RAF frame (convergence check happens before setState).
 * - A same-target guard prevents restarting an in-progress animation.
 */
export function useMapAnimation(initialCenter: [number, number] = [0, 0], initialZoom: number = 1, isDrilldown: boolean = false) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [subRegionCenter, setSubRegionCenter] = useState<[number, number]>([0, 0]);
  const [subRegionZoom, setSubRegionZoom] = useState(1);

  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const liveRef = useRef({ cx: initialCenter[0], cy: initialCenter[1], zoom: initialZoom });
  // Track the last animation target to skip redundant re-triggers
  const lastTargetRef = useRef<{ cx: number; cy: number; zoom: number } | null>(null);

  // Sync liveRef with user drag/zoom when no program animation is running
  useEffect(() => {
    if (isAnimatingRef.current) return;
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

  const animateTo = useCallback((targetCx: number, targetCy: number, targetZoom: number, forceDrilldown?: boolean, onConverged?: () => void) => {
    const last = lastTargetRef.current;
    // If already animating to the exact same target, skip — prevents effect-loop re-triggers
    if (last && last.cx === targetCx && last.cy === targetCy && last.zoom === targetZoom && isAnimatingRef.current) {
      return;
    }

    // If the live position is already at the target (within epsilon), do nothing at all.
    // This prevents creating new array references that would re-trigger React renders.
    const live = liveRef.current;
    if (
      Math.abs(live.cx - targetCx) < 0.001 &&
      Math.abs(live.cy - targetCy) < 0.001 &&
      Math.abs(live.zoom - targetZoom) < 0.001
    ) {
      isAnimatingRef.current = false;
      lastTargetRef.current = { cx: targetCx, cy: targetCy, zoom: targetZoom };
      onConverged?.();
      return;
    }

    lastTargetRef.current = { cx: targetCx, cy: targetCy, zoom: targetZoom };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isAnimatingRef.current = true;
    const targetIsDrill = forceDrilldown !== undefined ? forceDrilldown : isDrilldown;

    const start = { ...liveRef.current };
    const toMercatorY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
    const fromMercatorY = (y: number): number => Math.atan(Math.sinh(y)) * 180 / Math.PI;
    const startY = toMercatorY(start.cy);
    const targetY = toMercatorY(targetCy);
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduceMotion ? 0 : 520;
    let startTime: number | null = null;

    const step = (time: number) => {
      if (startTime === null) startTime = time;
      const l = liveRef.current;
      const progress = duration === 0 ? 1 : Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      l.zoom = start.zoom + (targetZoom - start.zoom) * eased;

      // Keep the destination's screen position moving monotonically toward the
      // center. Interpolating center and zoom separately made it first fly away
      // from the target whenever the zoom ratio was large.
      const remaining = (1 - eased) * start.zoom / l.zoom;
      l.cx = targetCx - (targetCx - start.cx) * remaining;
      l.cy = fromMercatorY(targetY - (targetY - startY) * remaining);
      const converged = progress === 1;

      // ONE setState call per frame (after the convergence snap if applicable)
      if (targetIsDrill) {
        setSubRegionCenter([l.cx, l.cy]);
        setSubRegionZoom(l.zoom);
      } else {
        setMapCenter([l.cx, l.cy]);
        setMapZoom(l.zoom);
      }

      if (!converged) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        isAnimatingRef.current = false;
        animFrameRef.current = null;
        onConverged?.();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, [isDrilldown]);

  // Cleanup on unmount
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  const resetSubRegionView = useCallback((center: [number, number], zoom: number) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isAnimatingRef.current = false;
    lastTargetRef.current = null;
    liveRef.current = { cx: center[0], cy: center[1], zoom };
    setSubRegionCenter(center);
    setSubRegionZoom(zoom);
  }, []);

  return {
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    subRegionCenter,
    setSubRegionCenter,
    subRegionZoom,
    setSubRegionZoom,
    resetSubRegionView,
    animateTo
  };
}
