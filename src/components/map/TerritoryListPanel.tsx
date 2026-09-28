import React, { useState, useEffect, useRef } from 'react';
import { Check, Heart, Ban, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlaceStatus } from '../../store/useStore';
import type { Territory } from '../../data/territoriesRegistry';
import { FlagImage } from '../common/FlagImage';

interface TerritoryListPanelProps {
  activeCountry: string;
  territories: Territory[];
  territoryLabel?: string;
  places: Record<string, { status: PlaceStatus }>;
  onSetStatus: (countryId: string, status: PlaceStatus) => void;
  highlightedTerritoryId?: string | null;
  isExiting?: boolean;
}

const COMPACT_PANEL_QUERY = '(max-width: 1100px), (max-height: 700px)';

function shouldStartCollapsed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COMPACT_PANEL_QUERY).matches;
}

export const TerritoryListPanel: React.FC<TerritoryListPanelProps> = ({
  activeCountry,
  territories,
  territoryLabel,
  places,
  onSetStatus,
  highlightedTerritoryId,
  isExiting = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(shouldStartCollapsed);
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const compactViewport = window.matchMedia(COMPACT_PANEL_QUERY);
    const applyViewportDefault = () => setIsCollapsed(compactViewport.matches);
    applyViewportDefault();
    compactViewport.addEventListener('change', applyViewportDefault);
    return () => compactViewport.removeEventListener('change', applyViewportDefault);
  }, [activeCountry]);

  // Auto-expand panel and scroll to the highlighted territory when searched
  useEffect(() => {
    if (highlightedTerritoryId && territories.some((t) => t.id === highlightedTerritoryId)) {
      const timer = setTimeout(() => {
        setIsCollapsed(false);
        // Wait for the next render commit before scrolling
        setTimeout(() => {
          if (highlightedRef.current) {
            highlightedRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        }, 50);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedTerritoryId, territories]);

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div
      className={`territory-list-panel ${isCollapsed ? 'territory-list-panel--collapsed' : ''}${isExiting ? ' territory-list-panel--exiting' : ''}`}
      inert={isExiting}
    >
      <button
        type="button"
        className="territory-list-panel__header"
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed}
      >
        <span className="territory-list-panel__title">
          {territoryLabel || 'Territories'}
        </span>
        <span className="territory-list-panel__count">{territories.length}</span>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div className="territory-list-panel__body" aria-hidden={isCollapsed} inert={isCollapsed}>
        <div className="territory-list-panel__list">
          {territories.map((territory) => {
            const status = places[territory.id]?.status || 'NONE';
            const statusClass = 
              status === 'VISITED' ? 'territory-list-panel__item--visited' :
              status === 'WISHLIST' ? 'territory-list-panel__item--wishlist' :
              status === 'REVISIT' ? 'territory-list-panel__item--revisit' :
              status === 'AVOID' ? 'territory-list-panel__item--avoid' : '';
            
            const isHighlighted = territory.id === highlightedTerritoryId;

            return (
              <div 
                key={territory.id} 
                ref={isHighlighted ? highlightedRef : null}
                className={`territory-list-panel__item ${statusClass} ${isHighlighted ? 'territory-list-panel__item--highlighted' : ''}`}
              >
                <div className="territory-list-panel__item-info">
                  {territory.flagCode ? (
                    <FlagImage
                      placeId={territory.id}
                      className="territory-list-panel__item-flag"
                    />
                  ) : (
                    <div
                      className={`territory-list-panel__item-dot territory-list-panel__item-dot--${status.toLowerCase()}`}
                    />
                  )}
                  <span className="territory-list-panel__item-name">{territory.name}</span>
                </div>
                <div className="territory-list-panel__item-actions">
                  {([
                    { s: 'VISITED' as const, label: 'Visited', Icon: Check, cls: 'visited' },
                    { s: 'WISHLIST' as const, label: 'Wishlist', Icon: Heart, cls: 'wishlist' },
                    { s: 'REVISIT' as const, label: 'Revisit', Icon: RotateCcw, cls: 'revisit' },
                    { s: 'AVOID' as const, label: 'Avoid', Icon: Ban, cls: 'avoid' },
                  ]).map(({ s, label, Icon, cls }) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSetStatus(territory.id, status === s ? 'NONE' : s)}
                      className={`territory-list-panel__action-btn territory-list-panel__action-btn--${cls} ${status === s ? 'territory-list-panel__action-btn--active' : ''}`}
                      aria-label={`${status === s ? 'Clear' : 'Mark'} ${territory.name} ${status === s ? 'status' : `as ${label}`}`}
                      aria-pressed={status === s}
                      title={status === s ? `Clear ${label}` : `Mark as ${label}`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
