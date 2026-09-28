import React, { useMemo, useState } from 'react';
import { Check, Heart, RotateCcw, Ban, ChevronUp, EyeOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { COUNTRIES } from '../../data/countries';

interface MapFilterBarProps {
  showVisited: boolean;
  showWishlist: boolean;
  showAvoid: boolean;
  showRevisit: boolean;
  setShowVisited: (show: boolean) => void;
  setShowWishlist: (show: boolean) => void;
  setShowAvoid: (show: boolean) => void;
  setShowRevisit: (show: boolean) => void;
  activeCountry?: string | null;
  drilldownHeader?: React.ReactNode;
  subRegions?: { id: string; name: string }[];
  isExiting?: boolean;
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
  showVisited, showWishlist, showAvoid, showRevisit,
  setShowVisited, setShowWishlist, setShowAvoid, setShowRevisit,
  activeCountry = null, drilldownHeader, subRegions = [], isExiting = false,
}) => {
  const places = useStore((state) => state.places);
  const [expanded, setExpanded] = useState(false);

  const worldCounts = useMemo(() => {
    const result = { VISITED: 0, WISHLIST: 0, REVISIT: 0, AVOID: 0 };
    COUNTRIES.forEach(({ id }) => {
      const status = places[id]?.status;
      if (status && status in result) result[status as keyof typeof result]++;
    });
    return result;
  }, [places]);

  const regionCounts = useMemo(() => {
    const result = { VISITED: 0, WISHLIST: 0, REVISIT: 0, AVOID: 0 };
    if (!activeCountry) return result;
    subRegions.forEach(({ id }) => {
      const status = places[activeCountry]?.regions?.[id] ?? places[id]?.status;
      if (status && status in result) result[status as keyof typeof result]++;
    });
    return result;
  }, [places, activeCountry, subRegions]);

  const filters = [
    { key: 'VISITED', label: 'Visited', icon: Check, shown: showVisited, toggle: () => setShowVisited(!showVisited) },
    { key: 'WISHLIST', label: 'Wishlist', icon: Heart, shown: showWishlist, toggle: () => setShowWishlist(!showWishlist) },
    { key: 'REVISIT', label: 'Revisit', icon: RotateCcw, shown: showRevisit, toggle: () => setShowRevisit(!showRevisit) },
    { key: 'AVOID', label: 'Avoid', icon: Ban, shown: showAvoid, toggle: () => setShowAvoid(!showAvoid) },
  ] as const;

  const renderControls = (counts: typeof worldCounts, scope: 'world' | 'country') => (
    <>
      <button
        type="button"
        className="map-filter-bar__toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={`map-status-filters-${scope}`}
      >
        <span>Map statuses</span>
        <ChevronUp size={18} aria-hidden="true" />
      </button>

      <div className="map-filter-bar__summary" aria-label="Tracked places summary">
        {filters.map(({ key, label }) => (
          <div className={`map-filter-bar__summary-item map-filter-bar__summary-item--${key.toLowerCase()}`} key={key}>
            <strong>{counts[key]}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="map-filter-bar__body" id={`map-status-filters-${scope}`}>
        <p className="map-filter-bar__section-label">Show on map</p>
        {filters.map(({ key, label, icon: Icon, shown, toggle }) => (
          <button
            type="button"
            key={key}
            className={`map-filter-bar__pill map-filter-bar__pill--${key.toLowerCase()}${shown ? ' map-filter-bar__pill--active' : ''}`}
            onClick={toggle}
            aria-pressed={shown}
            title={shown ? `Hide ${label}` : `Show ${label}`}
          >
            <span className="map-filter-bar__pill-icon"><Icon size={16} strokeWidth={1.8} /></span>
            <span className="map-filter-bar__pill-label">{label}</span>
            <span className="map-filter-bar__pill-count">{counts[key]}</span>
            <span className="map-filter-bar__pill-check" aria-hidden="true">{shown ? <Check size={15} /> : <EyeOff size={15} />}</span>
          </button>
        ))}
        <p className="map-filter-bar__help">{scope === 'country' ? 'Select a region on the map to mark it.' : 'Select a country on the map to mark it or explore its regions.'}</p>
        <span className="map-filter-bar__total">{scope === 'country' ? `${subRegions.length} regions` : `${COUNTRIES.length} countries`}</span>
      </div>
    </>
  );

  return (
    <aside className={`map-filter-bar${activeCountry ? ' map-filter-bar--drilldown' : ''}${expanded ? ' map-filter-bar--expanded' : ''}${isExiting ? ' map-filter-bar--exiting' : ''}`} aria-label="Map status filters" inert={isExiting}>
      <div className={`map-filter-bar__view map-filter-bar__view--world${activeCountry && !isExiting ? ' map-filter-bar__view--leaving' : ''}${isExiting ? ' map-filter-bar__view--returning' : ''}`} aria-hidden={!!activeCountry && !isExiting} inert={!!activeCountry}>
        <div className="map-filter-bar__intro">
          <h1>Your world</h1>
          <p>A personal map of where you have been and where to next.</p>
        </div>
        {renderControls(worldCounts, 'world')}
      </div>
      {activeCountry && (
        <div className={`map-filter-bar__view map-filter-bar__view--country${isExiting ? ' map-filter-bar__view--leaving' : ''}`} aria-hidden={isExiting} inert={isExiting}>
          {drilldownHeader}
          {renderControls(regionCounts, 'country')}
        </div>
      )}
    </aside>
  );
};
