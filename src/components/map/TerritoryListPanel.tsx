import React, { useState } from 'react';
import { Check, Heart, Ban, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlaceStatus } from '../../store/useStore';
import type { MapMarker } from '../../data/mapData';
import { getFillColor } from '../../utils/mapUtils';

interface TerritoryListPanelProps {
  activeCountry: string;
  territories: MapMarker[];
  territoryLabel?: string;
  places: Record<string, { status: PlaceStatus }>;
  onSetStatus: (countryId: string, status: PlaceStatus) => void;
}

export const TerritoryListPanel: React.FC<TerritoryListPanelProps> = ({
  territories,
  territoryLabel,
  places,
  onSetStatus,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="territory-list-panel">
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
            return (
              <div key={territory.id} className={`territory-list-panel__item ${statusClass}`}>
                <div className="territory-list-panel__item-info">
                  {territory.flagCode ? (
                    <img
                      src={`https://flagcdn.com/24x18/${territory.flagCode}.png`}
                      alt=""
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
                      <Icon size={10} />
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
