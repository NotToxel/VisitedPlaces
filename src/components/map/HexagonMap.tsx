import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { hexGridData } from '../../utils/hexGridData';
import { getFillColor, showMapTooltip, hideMapTooltip } from '../../utils/mapUtils';

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

  // --- Animation ---
  const animateTo = useCallback((targetTx: number, targetTy: number, targetZoom: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = () => {
      const live = liveRef.current;
      const f = 0.1;
      live.tx += (targetTx - live.tx) * f;
      live.ty += (targetTy - live.ty) * f;
      live.zoom += (targetZoom - live.zoom) * f;
      setTx(live.tx);
      setTy(live.ty);
      setZoom(live.zoom);
      const done =
        Math.abs(targetTx - live.tx) < 0.15 &&
        Math.abs(targetTy - live.ty) < 0.15 &&
        Math.abs(targetZoom - live.zoom) < 0.005;
      if (!done) {
        animRef.current = requestAnimationFrame(step);
      } else {
        live.tx = targetTx; live.ty = targetTy; live.zoom = targetZoom;
        setTx(targetTx); setTy(targetTy); setZoom(targetZoom);
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  // --- Pan to highlighted country ---
  useEffect(() => {
    if (!highlightedCountry) {
      animateTo(INITIAL_TX, INITIAL_TY, INITIAL_ZOOM);
      return;
    }
    const dot = (hexGridData as Record<string, { x: number; y: number; name: string }>)[highlightedCountry];
    if (!dot) return;
    const { cx, cy } = hexCenter(dot);
    const targetZoom = 3.5;
    // Centre (cx, cy) in viewbox: targetZoom*(cx + targetTx) = SVG_W/2
    const targetTx = SVG_W / 2 / targetZoom - cx;
    const targetTy = SVG_H / 2 / targetZoom - cy;
    animateTo(targetTx, targetTy, targetZoom);
  }, [highlightedCountry, animateTo]);

  // --- Helper: client pixel → SVG viewBox coords ---
  const clientToViewbox = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { vx: 0, vy: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      vx: (clientX - rect.left) / rect.width * SVG_W,
      vy: (clientY - rect.top) / rect.height * SVG_H,
    };
  }, []);

  // --- Wheel zoom: anchored to cursor ---
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const { vx, vy } = clientToViewbox(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldZoom = liveRef.current.zoom;
    const newZoom = Math.max(0.4, Math.min(12, oldZoom * factor));

    // Keep point (vx, vy) fixed: newZoom*(gx + newTx) = vx
    // gx = vx/oldZoom - tx  =>  newTx = vx/newZoom - gx = tx + vx*(1/newZoom - 1/oldZoom)
    const newTx = liveRef.current.tx + vx * (1 / newZoom - 1 / oldZoom);
    const newTy = liveRef.current.ty + vy * (1 / newZoom - 1 / oldZoom);

    if (animRef.current) cancelAnimationFrame(animRef.current);
    liveRef.current.zoom = newZoom;
    liveRef.current.tx = newTx;
    liveRef.current.ty = newTy;
    setZoom(newZoom);
    setTx(newTx);
    setTy(newTy);
  }, [clientToViewbox]);

  // --- Drag pan ---
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
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
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    const newTx = dragRef.current.startTx + dx;
    const newTy = dragRef.current.startTy + dy;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    liveRef.current.tx = newTx;
    liveRef.current.ty = newTy;
    setTx(newTx);
    setTy(newTy);
  }, []);

  const handleMouseUp = useCallback(() => { 
    setIsDragging(false);
    dragRef.current = null; 
  }, []);

  const handleCountryClick = useCallback((countryId: string, event: React.MouseEvent) => {
    // Ignore if we were dragging
    if (dragRef.current?.moved) return;
    if (!countryId) return;
    onCountryClick(countryId, event);
  }, [onCountryClick]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', height: '100%', outline: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`scale(${zoom}) translate(${tx}, ${ty})`}>
        {Object.entries(hexGridData).map(([countryId, dot]) => {
          const status = places[countryId]?.status || 'NONE';
          const isHovered = hoveredId === countryId;
          const isHighlighted = highlightedCountry === countryId;
          const isSelected = status !== 'NONE';
          const { cx, cy } = hexCenter(dot);

          return (
            <g key={countryId}>
              <path
                d={HEX_PATH}
                transform={`translate(${cx}, ${cy}) ${isHighlighted ? 'scale(1.15)' : isHovered ? 'scale(1.05)' : 'scale(1)'}`}
                fill={getFillColor(status, isHovered || isHighlighted, false, showVisited, showWishlist, showAvoid, showRevisit)}
                stroke="var(--map-stroke)"
                strokeWidth={0.8}
                style={{ cursor: 'pointer', outline: 'none', transition: 'fill 0.2s ease, transform 0.2s ease' }}
                onMouseEnter={(e) => {
                  setHoveredId(countryId);
                  showMapTooltip(`${dot.name}${isSelected ? ` - ${status}` : ''}`, e);
                }}
                onMouseMove={(e) => {
                  showMapTooltip(`${dot.name}${isSelected ? ` - ${status}` : ''}`, e);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  hideMapTooltip();
                }}
                onClick={(e) => handleCountryClick(countryId, e as unknown as React.MouseEvent)}
              />
              {showLabels && (
                <text
                  x={cx} y={cy}
                  textAnchor="middle"
                  dy=".35em"
                  fontSize="4.5"
                  fill="var(--text-primary)"
                  style={{ pointerEvents: 'none', fontWeight: 600, opacity: 0.8 }}
                >
                  {countryId}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export const HexagonMap = memo(HexagonMapBase);
