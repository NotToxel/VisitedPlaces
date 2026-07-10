import React, { useMemo } from 'react';
import { Check, Heart, RotateCcw, Ban, Eye, EyeOff } from 'lucide-react';
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
  subRegions?: { id: string; name: string }[];
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
  showVisited,
  showWishlist,
  showAvoid,
  showRevisit,
  setShowVisited,
  setShowWishlist,
  setShowAvoid,
  setShowRevisit,
  activeCountry = null,
  subRegions = [],
}) => {
  const { places } = useStore();

  const counts = useMemo(() => {
    const result = { visited: 0, wishlist: 0, revisit: 0, avoid: 0 };

    if (activeCountry && subRegions && subRegions.length > 0) {
      // Drilldown view — count statuses for active country's sub-regions
      subRegions.forEach((r) => {
        let status = places[activeCountry]?.regions?.[r.id];
        if (status === undefined) status = places[r.id]?.status;

        if (status === 'VISITED') result.visited++;
        else if (status === 'WISHLIST') result.wishlist++;
        else if (status === 'REVISIT') result.revisit++;
        else if (status === 'AVOID') result.avoid++;
      });
    } else {
      // World view — count statuses for all countries
      COUNTRIES.forEach((c) => {
        const status = places[c.id]?.status;
        if (status === 'VISITED') result.visited++;
        else if (status === 'WISHLIST') result.wishlist++;
        else if (status === 'REVISIT') result.revisit++;
        else if (status === 'AVOID') result.avoid++;
      });
    }
    return result;
  }, [places, activeCountry, subRegions]);

  const pills: {
    label: string;
    count: number;
    shown: boolean;
    toggle: () => void;
    colorVar: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: 'Visited',
      count: counts.visited,
      shown: showVisited,
      toggle: () => setShowVisited(!showVisited),
      colorVar: 'var(--accent-visited)',
      icon: <Check size={12} />,
    },
    {
      label: 'Wishlist',
      count: counts.wishlist,
      shown: showWishlist,
      toggle: () => setShowWishlist(!showWishlist),
      colorVar: 'var(--accent-wishlist)',
      icon: <Heart size={12} />,
    },
    {
      label: 'Revisit',
      count: counts.revisit,
      shown: showRevisit,
      toggle: () => setShowRevisit(!showRevisit),
      colorVar: 'var(--accent-revisit)',
      icon: <RotateCcw size={12} />,
    },
    {
      label: 'Avoid',
      count: counts.avoid,
      shown: showAvoid,
      toggle: () => setShowAvoid(!showAvoid),
      colorVar: 'var(--accent-avoid)',
      icon: <Ban size={12} />,
    },
  ];

  return (
    <div className="map-filter-bar">
      {pills.map(({ label, count, shown, toggle, colorVar, icon }) => (
        <button
          key={label}
          className={`map-filter-bar__pill ${shown ? 'map-filter-bar__pill--active' : ''}`}
          style={{ '--pill-color': colorVar } as React.CSSProperties}
          onClick={toggle}
          title={shown ? `Hide ${label}` : `Show ${label}`}
        >
          <span className="map-filter-bar__pill-icon">
            {shown ? icon : <EyeOff size={12} />}
          </span>
          <span className="map-filter-bar__pill-label">{label}</span>
          <span className="map-filter-bar__pill-count">{count}</span>
          <span className="map-filter-bar__pill-eye">
            {shown ? <Eye size={10} /> : <EyeOff size={10} />}
          </span>
        </button>
      ))}
    </div>
  );
};
