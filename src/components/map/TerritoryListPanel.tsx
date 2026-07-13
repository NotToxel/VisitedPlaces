import React, { useState, useEffect, useRef } from 'react';
import { Check, Heart, Ban, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlaceStatus } from '../../store/useStore';
import type { Territory } from '../../data/territoriesRegistry';
import { getFillColor } from '../../utils/mapUtils';
import { FlagImage } from '../common/FlagImage';

interface TerritoryListPanelProps {
  activeCountry: string;
  territories: Territory[];
  territoryLabel?: string;
  places: Record<string, { status: PlaceStatus }>;
  onSetStatus: (countryId: string, status: PlaceStatus) => void;
  highlightedTerritoryId?: string | null;
}

export const TerritoryListPanel: React.FC<TerritoryListPanelProps> = ({
  territories,
  territoryLabel,
  places,
  onSetStatus,
  highlightedTerritoryId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const highlightedRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="territory-list-panel">
      {/* Grab handle indicator for mobile bottom-sheet view */}
      <div className="territory-list-panel__grab-handle" />
      
      <button
        className="territory-list-panel__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="territory-list-panel__title">
          {territoryLabel || 'Territories'}
        </span>
        {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {!isCollapsed && (
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
                      className="territory-list-panel__item-dot"
                      style={{ background: getFillColor(status, false, true, true, true, true, true) }}
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
                      onClick={() => onSetStatus(territory.id, status === s ? 'NONE' : s)}
                      className={`territory-list-panel__action-btn territory-list-panel__action-btn--${cls} ${status === s ? 'territory-list-panel__action-btn--active' : ''}`}
                      title={label}
                    >
                      <Icon size={11} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
