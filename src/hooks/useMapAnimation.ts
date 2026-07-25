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

  const animateTo = useCallback((targetCx: number, targetCy: number, targetZoom: number, forceDrilldown?: boolean) => {
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
      return;
    }

    lastTargetRef.current = { cx: targetCx, cy: targetCy, zoom: targetZoom };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isAnimatingRef.current = true;
    const targetIsDrill = forceDrilldown !== undefined ? forceDrilldown : isDrilldown;

    const step = () => {
      const l = liveRef.current;
      const prevCx = l.cx;
      const prevCy = l.cy;
      const prevZoom = l.zoom;

      const factor = 0.12; // smooth ease-out
      l.cx += (targetCx - l.cx) * factor;
      l.cy += (targetCy - l.cy) * factor;
      l.zoom += (targetZoom - l.zoom) * factor;

      // Check per-step movement — converge when movement drops to noise level
      const stepCx = Math.abs(l.cx - prevCx);
      const stepCy = Math.abs(l.cy - prevCy);
      const stepZoom = Math.abs(l.zoom - prevZoom);
      const converged = stepCx <= 0.001 && stepCy <= 0.001 && stepZoom <= 0.001;

      if (converged) {
        // Snap exactly to target before final setState
        l.cx = targetCx;
        l.cy = targetCy;
        l.zoom = targetZoom;
      }

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
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, [isDrilldown]);

  // Cleanup on unmount
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
