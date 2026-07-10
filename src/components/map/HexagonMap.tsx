import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { hexGridData } from '../../utils/hexGridData';
import { getFillColor, showMapTooltip, hideMapTooltip, formatStatusLabel } from '../../utils/mapUtils';

interface HexagonMapProps {
  highlightedCountry?: string | null;
  showLabels?: boolean;
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  showRevisit: boolean;
  onCountryClick: (countryId: string, event: React.MouseEvent) => void;
}

const RADIUS = 11;
// Pointy-top hexagons
const X_SPACING = Math.sqrt(3) * RADIUS;
const Y_SPACING = RADIUS * 1.5;

const SVG_W = 900;
const SVG_H = 550;

// Approximate centre of the whole hex world map in group coords
// (used for initial centering)
const GRID_CENTER_X = 335;
const GRID_CENTER_Y = 228;
const INITIAL_ZOOM = 1.35;
const INITIAL_TX = SVG_W / 2 / INITIAL_ZOOM - GRID_CENTER_X;   // ≈ -2
const INITIAL_TY = SVG_H / 2 / INITIAL_ZOOM - GRID_CENTER_Y;   // ≈ -24

const generateHexagonPath = (r: number) => {
  const angles = [0, 60, 120, 180, 240, 300];
  const points = angles.map(angle => {
    const rad = (angle - 30) * (Math.PI / 180);
    return `${r * Math.cos(rad)},${r * Math.sin(rad)}`;
  });
  return `M${points.join('L')}Z`;
};

const HEX_PATH = generateHexagonPath(RADIUS);



/** SVG group-space pixel centre for a hex grid dot */
function hexCenter(dot: { x: number; y: number }) {
  return {
    cx: dot.x * X_SPACING + (dot.y % 2 === 1 ? X_SPACING / 2 : 0) + 40,
    cy: dot.y * Y_SPACING + 30,
  };
}

const HexagonMapBase: React.FC<HexagonMapProps> = ({
  highlightedCountry,
  showLabels,
  showVisited,
  showWishlist,
  showAvoid,
  showRevisit,
  onCountryClick
}) => {
  const { places } = useStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const baseHighlighted = highlightedCountry ? highlightedCountry.split('-')[0] : null;
  const [isDragging, setIsDragging] = useState(false);

  // Viewport transform: the SVG group gets  scale(zoom) translate(tx, ty)
  // A group coord (gx, gy) → screen viewbox (zoom*(gx+tx), zoom*(gy+ty))
  const [tx, setTx] = useState(INITIAL_TX);
  const [ty, setTy] = useState(INITIAL_TY);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  const liveRef = useRef({ tx: INITIAL_TX, ty: INITIAL_TY, zoom: INITIAL_ZOOM });
  const animRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag tracking
  const dragRef = useRef<{
    startX: number; startY: number;
    startTx: number; startTy: number;
    moved: boolean;
  } | null>(null);

  // Touch tracking (pan and pinch-to-zoom)
  const touchRef = useRef<{
    startX: number; startY: number;
    startTx: number; startTy: number;
    startDistance: number;
    startZoom: number;
    midVx: number; midVy: number;
    moved: boolean;
  } | null>(null);

  // Global drag-moved tracker to prevent clicks on drag release
  const hasMovedRef = useRef(false);

  // --- Helper: client pixel → SVG viewBox coords ---
  const clientToViewbox = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { vx: 0, vy: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      vx: (clientX - rect.left) / rect.width * SVG_W,
      vy: (clientY - rect.top) / rect.height * SVG_H,
    };
  }, []);

  const constrainTranslation = useCallback((proposedTx: number, proposedTy: number, currentZoom: number) => {
    const gx = SVG_W / 2 / currentZoom - proposedTx;
    const gy = SVG_H / 2 / currentZoom - proposedTy;
    const minGx = -200;
    const maxGx = SVG_W + 200;
    const minGy = -150;
    const maxGy = SVG_H + 150;
    const constrainedGx = Math.max(minGx, Math.min(maxGx, gx));
    const constrainedGy = Math.max(minGy, Math.min(maxGy, gy));
    return {
      tx: SVG_W / 2 / currentZoom - constrainedGx,
      ty: SVG_H / 2 / currentZoom - constrainedGy,
    };
  }, []);

  // --- Animation ---
  const animateTo = useCallback((targetTx: number, targetTy: number, targetZoom: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = () => {
      const live = liveRef.current;
      const f = 0.1;
      live.tx += (targetTx - live.tx) * f;
      live.ty += (targetTy - live.ty) * f;
      live.zoom += (targetZoom - live.zoom) * f;

      const constrained = constrainTranslation(live.tx, live.ty, live.zoom);
      setTx(constrained.tx);
      setTy(constrained.ty);
      setZoom(live.zoom);
      const done =
        Math.abs(targetTx - live.tx) < 0.15 &&
        Math.abs(targetTy - live.ty) < 0.15 &&
        Math.abs(targetZoom - live.zoom) < 0.005;
      if (!done) {
        animRef.current = requestAnimationFrame(step);
      } else {
        const finalConstrained = constrainTranslation(targetTx, targetTy, targetZoom);
        live.tx = finalConstrained.tx; live.ty = finalConstrained.ty; live.zoom = targetZoom;
        setTx(finalConstrained.tx); setTy(finalConstrained.ty); setZoom(targetZoom);
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, [constrainTranslation]);

  // --- Pan to highlighted country ---
  useEffect(() => {
    if (!baseHighlighted) {
      animateTo(INITIAL_TX, INITIAL_TY, INITIAL_ZOOM);
      return;
    }
    const dot = (hexGridData as Record<string, { x: number; y: number; name: string }>)[baseHighlighted];
    if (!dot) return;
    const { cx, cy } = hexCenter(dot);
    const targetZoom = 3.5;
    // Centre (cx, cy) in viewbox: targetZoom*(cx + targetTx) = SVG_W/2
    const targetTx = SVG_W / 2 / targetZoom - cx;
    const targetTy = SVG_H / 2 / targetZoom - cy;
    animateTo(targetTx, targetTy, targetZoom);
  }, [baseHighlighted, animateTo]);

  // --- Wheel zoom: anchored to cursor ---
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const { vx, vy } = clientToViewbox(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldZoom = liveRef.current.zoom;
    const newZoom = Math.max(0.4, Math.min(12, oldZoom * factor));

    const newTx = liveRef.current.tx + vx * (1 / newZoom - 1 / oldZoom);
    const newTy = liveRef.current.ty + vy * (1 / newZoom - 1 / oldZoom);
    const constrained = constrainTranslation(newTx, newTy, newZoom);

    if (animRef.current) cancelAnimationFrame(animRef.current);
    liveRef.current.zoom = newZoom;
    liveRef.current.tx = constrained.tx;
    liveRef.current.ty = constrained.ty;
    setZoom(newZoom);
    setTx(constrained.tx);
    setTy(constrained.ty);
  }, [clientToViewbox, constrainTranslation]);

  // --- Drag pan ---
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: liveRef.current.tx,
      startTy: liveRef.current.ty,
      moved: false,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    // Convert screen delta → viewbox delta → group delta
    const dx = (e.clientX - dragRef.current.startX) * (SVG_W / rect.width) / liveRef.current.zoom;
    const dy = (e.clientY - dragRef.current.startY) * (SVG_H / rect.height) / liveRef.current.zoom;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragRef.current.moved = true;
      hasMovedRef.current = true;
    }
    const newTx = dragRef.current.startTx + dx;
    const newTy = dragRef.current.startTy + dy;
    const constrained = constrainTranslation(newTx, newTy, liveRef.current.zoom);

    if (animRef.current) cancelAnimationFrame(animRef.current);
    liveRef.current.tx = constrained.tx;
    liveRef.current.ty = constrained.ty;
    setTx(constrained.tx);
    setTy(constrained.ty);
  }, [constrainTranslation]);

  const handleMouseUp = useCallback(() => { 
    setIsDragging(false);
    dragRef.current = null; 
  }, []);

  // --- Touch event handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    hasMovedRef.current = false;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTx: liveRef.current.tx,
        startTy: liveRef.current.ty,
        startDistance: 0,
        startZoom: liveRef.current.zoom,
        midVx: 0,
        midVy: 0,
        moved: false
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const { vx, vy } = clientToViewbox(midX, midY);

      touchRef.current = {
        startX: 0,
        startY: 0,
        startTx: liveRef.current.tx,
        startTy: liveRef.current.ty,
        startDistance: dist,
        startZoom: liveRef.current.zoom,
        midVx: vx,
        midVy: vy,
        moved: true
      };
      hasMovedRef.current = true;
    }
  }, [clientToViewbox]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!touchRef.current || !svgRef.current) return;

    if (e.touches.length === 1 && touchRef.current.startDistance === 0) {
      const t = e.touches[0];
      const rect = svgRef.current.getBoundingClientRect();
      const dx = (t.clientX - touchRef.current.startX) * (SVG_W / rect.width) / liveRef.current.zoom;
      const dy = (t.clientY - touchRef.current.startY) * (SVG_H / rect.height) / liveRef.current.zoom;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        touchRef.current.moved = true;
        hasMovedRef.current = true;
      }

      const newTx = touchRef.current.startTx + dx;
      const newTy = touchRef.current.startTy + dy;
      const constrained = constrainTranslation(newTx, newTy, liveRef.current.zoom);

      if (animRef.current) cancelAnimationFrame(animRef.current);
      liveRef.current.tx = constrained.tx;
      liveRef.current.ty = constrained.ty;
      setTx(constrained.tx);
      setTy(constrained.ty);
    } else if (e.touches.length === 2 && touchRef.current.startDistance > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (dist === 0) return;

      const factor = dist / touchRef.current.startDistance;
      const startZoom = touchRef.current.startZoom;
      const newZoom = Math.max(0.4, Math.min(12, startZoom * factor));

      const vx = touchRef.current.midVx;
      const vy = touchRef.current.midVy;
      const newTx = touchRef.current.startTx + vx * (1 / newZoom - 1 / startZoom);
      const newTy = touchRef.current.startTy + vy * (1 / newZoom - 1 / startZoom);
      const constrained = constrainTranslation(newTx, newTy, newZoom);

      if (animRef.current) cancelAnimationFrame(animRef.current);
      liveRef.current.zoom = newZoom;
      liveRef.current.tx = constrained.tx;
      liveRef.current.ty = constrained.ty;
      setZoom(newZoom);
      setTx(constrained.tx);
      setTy(constrained.ty);
    }
  }, [constrainTranslation]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1 && touchRef.current) {
      const t = e.touches[0];
      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTx: liveRef.current.tx,
        startTy: liveRef.current.ty,
        startDistance: 0,
        startZoom: liveRef.current.zoom,
        midVx: 0,
        midVy: 0,
        moved: touchRef.current.moved
      };
    } else if (e.touches.length === 0) {
      touchRef.current = null;
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animateTo(INITIAL_TX, INITIAL_TY, INITIAL_ZOOM);
  }, [animateTo]);

  const handleCountryClick = useCallback((countryId: string, event: React.MouseEvent) => {
    // Ignore if we were dragging/panning/zooming
    if (hasMovedRef.current) return;
    if (!countryId) return;
    onCountryClick(countryId, event);
  }, [onCountryClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button 
        onClick={handleResetZoom}
        className="map-reset-zoom"
        title="Reset Map Zoom"
      >
        <RefreshCw size={12} />
        <span>Reset Zoom</span>
      </button>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <g transform={`scale(${zoom}) translate(${tx}, ${ty})`}>
          {Object.entries(hexGridData)
            .sort(([idA], [idB]) => {
              const isAActive = idA === baseHighlighted || idA === hoveredId;
              const isBActive = idB === baseHighlighted || idB === hoveredId;
              if (isAActive && !isBActive) return 1;
              if (!isAActive && isBActive) return -1;
              return 0;
            })
            .map(([countryId, dot]) => {
              const status = places[countryId]?.status || 'NONE';
              const isHovered = hoveredId === countryId;
              const isHighlighted = baseHighlighted === countryId;
              const isSelected = status !== 'NONE';
              const { cx, cy } = hexCenter(dot);

              return (
                <g key={countryId}>
                  <path
                    d={HEX_PATH}
                    transform={`translate(${cx}, ${cy}) ${isHighlighted ? 'scale(1.15)' : isHovered ? 'scale(1.05)' : 'scale(1)'}`}
                    fill={getFillColor(status, isHovered || isHighlighted, false, showVisited, showWishlist, showAvoid, showRevisit)}
                    stroke={isHighlighted ? "var(--accent-highlight)" : "var(--map-stroke)"}
                    strokeWidth={isHighlighted ? 1.6 : 0.8}
                    style={{ cursor: 'pointer', outline: 'none', transition: 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease, transform 0.2s ease' }}
                  onMouseEnter={(e) => {
                    if (window.matchMedia('(hover: hover)').matches) {
                      setHoveredId(countryId);
                    }
                    showMapTooltip(`${dot.name}${isSelected ? ` - ${formatStatusLabel(status)}` : ''}`, e);
                  }}
                  onMouseMove={(e) => {
                    showMapTooltip(`${dot.name}${isSelected ? ` - ${formatStatusLabel(status)}` : ''}`, e);
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    hideMapTooltip();
                  }}
                  onClick={(e) => handleCountryClick(countryId, e as unknown as React.MouseEvent)}
                />
                {showLabels && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dy=".35em"
                    fontSize="4.2"
                    fill="var(--text-primary)"
                    stroke="var(--bg-base-100)"
                    strokeWidth="0.8px"
                    paintOrder="stroke fill"
                    style={{ pointerEvents: 'none', fontWeight: 800 }}
                  >
                    {countryId}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export const HexagonMap = memo(HexagonMapBase);
