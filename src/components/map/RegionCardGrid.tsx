import React, { memo, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { Check, Heart, Ban, RotateCcw } from 'lucide-react';
import type { NERegionFeature, NEFeature } from '../../data/naturalEarthAdmin1';
import type { PlaceStatus } from '../../store/useStore';
import { FlagImage } from '../common/FlagImage';

interface RegionCardGridProps {
  activeCountry: string;
  features: NERegionFeature[];
  places: Record<string, { status: PlaceStatus; regions?: Record<string, PlaceStatus> }>;
  onSetRegionStatus: (countryId: string, regionId: string, status: PlaceStatus) => void;
  searchQuery?: string;
}

const CARD_SVG_WIDTH = 160;
const CARD_SVG_HEIGHT = 100;
const SVG_PADDING = 10; // pixels of padding inside the SVG

const STATUS_ACTIONS: { s: PlaceStatus; label: string; Icon: typeof Check; cls: string }[] = [
  { s: 'VISITED', label: 'Visited', Icon: Check, cls: 'visited' },
  { s: 'WISHLIST', label: 'Wishlist', Icon: Heart, cls: 'wishlist' },
  { s: 'REVISIT', label: 'Revisit', Icon: RotateCcw, cls: 'revisit' },
  { s: 'AVOID', label: 'Avoid', Icon: Ban, cls: 'avoid' },
];

interface RegionPathResult {
  path: string | null;
  scale: number;
}

/** Compute the SVG path string for a single NE feature, fitted to the card dimensions. */
function computeRegionPath(feature: NEFeature): RegionPathResult {
  try {
    const geoFeature = JSON.parse(JSON.stringify(feature)) as unknown as GeoJSON.Feature;

    // Check if it spans the antimeridian (180th meridian)
    let hasPositive = false;
    let hasNegative = false;
    function check(c: unknown) {
      if (!Array.isArray(c)) return;
      const first = c[0];
      const second = c[1];
      if (typeof first === 'number' && typeof second === 'number') {
        if (first > 90) hasPositive = true;
        if (first < -90) hasNegative = true;
        return;
      }
      for (const sub of c) {
        check(sub);
      }
    }
    if (geoFeature.geometry && 'coordinates' in geoFeature.geometry) {
      check(geoFeature.geometry.coordinates);
    }

    if (hasPositive && hasNegative && geoFeature.geometry && 'coordinates' in geoFeature.geometry) {
      // Shift negative longitudes to positive space (+360) so they form a contiguous shape
      // across the 180th meridian during bounding box calculations.
      function shift(c: unknown) {
        if (!Array.isArray(c)) return;
        const first = c[0];
        const second = c[1];
        if (typeof first === 'number' && typeof second === 'number') {
          const point = c as unknown as [number, number];
          if (point[0] < 0) {
            point[0] += 360;
          }
          return;
        }
        for (const sub of c) {
          shift(sub);
        }
      }
      shift(geoFeature.geometry.coordinates);
    }

    const projection = geoMercator();
    if (hasPositive && hasNegative) {
      // Rotate the projection by 180 degrees so the antimeridian is projected contiguously at the center
      projection.rotate([180, 0]);
    }

    projection.fitExtent(
      [[SVG_PADDING, SVG_PADDING], [CARD_SVG_WIDTH - SVG_PADDING, CARD_SVG_HEIGHT - SVG_PADDING]],
      geoFeature
    );
    const pathGen = geoPath(projection);
    return {
      path: pathGen(geoFeature) || null,
      scale: projection.scale()
    };
  } catch {
    return { path: null, scale: 150 };
  }
}

function getStatusColor(status: PlaceStatus): string {
  switch (status) {
    case 'VISITED': return 'var(--accent-visited)';
    case 'WISHLIST': return 'var(--accent-wishlist)';
    case 'AVOID': return 'var(--accent-avoid)';
    case 'REVISIT': return 'var(--accent-revisit)';
    default: return 'var(--card-shape-fill, var(--map-fill-unselected))';
  }
}

interface RegionCardProps {
  activeCountry: string;
  regionFeature: NERegionFeature;
  status: PlaceStatus;
  onSetRegionStatus: (countryId: string, regionId: string, status: PlaceStatus) => void;
}

const RegionCardBase: React.FC<RegionCardProps> = ({
  activeCountry,
  regionFeature,
  status,
  onSetRegionStatus,
}) => {
  const { regionId, displayName, feature } = regionFeature;

  const { path: svgPath, scale: projectionScale } = useMemo(() => computeRegionPath(feature), [feature]);

  const dynamicStrokeWidth = useMemo(() => {
    // Thicker outlines for smaller regions/islands (lower scale) to make them stand out
    return Math.max(0.6, Math.min(1.8, 1800 / projectionScale));
  }, [projectionScale]);

  const handleStatusClick = useCallback((s: PlaceStatus) => {
    onSetRegionStatus(activeCountry, regionId, status === s ? 'NONE' : s);
  }, [activeCountry, regionId, status, onSetRegionStatus]);

  const statusModifier = status !== 'NONE' ? `region-card--${status.toLowerCase()}` : '';

  return (
    <div className={`region-card ${statusModifier}`}>
      <svg
        className="region-card__map"
        viewBox={`0 0 ${CARD_SVG_WIDTH} ${CARD_SVG_HEIGHT}`}
      >
        {svgPath ? (
          <path
            d={svgPath}
            fill={getStatusColor(status)}
            stroke="var(--card-shape-stroke, var(--map-stroke))"
            strokeWidth={dynamicStrokeWidth}
            className="region-card__shape"
          />
        ) : (
          <circle
            cx={CARD_SVG_WIDTH / 2}
            cy={CARD_SVG_HEIGHT / 2}
            r={8}
            fill={getStatusColor(status)}
            stroke="var(--card-shape-stroke, var(--map-stroke))"
            strokeWidth={dynamicStrokeWidth}
            className="region-card__shape"
          />
        )}
      </svg>

      <div className="region-card__info">
        <FlagImage
          placeId={regionId}
          className="region-card__flag"
        />
        <span className="region-card__name" title={displayName}>{displayName}</span>
      </div>

      <div className="region-card__actions">
        {STATUS_ACTIONS.map(({ s, label, Icon, cls }) => (
          <button
            key={s}
            onClick={() => handleStatusClick(s)}
            className={`region-card__action-btn region-card__action-btn--${cls} ${status === s ? 'region-card__action-btn--active' : ''}`}
            title={label}
          >
            <Icon size={13} />
          </button>
        ))}
      </div>
    </div>
  );
};

const RegionCard = memo(RegionCardBase);

const RegionCardGridBase: React.FC<RegionCardGridProps> = ({
  activeCountry,
  features,
  places,
  onSetRegionStatus,
  searchQuery = '',
}) => {
  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return features;
    const lowerQuery = searchQuery.toLowerCase();
    return features.filter(
      (f) => f.displayName.toLowerCase().includes(lowerQuery) || f.regionId.toLowerCase().includes(lowerQuery)
    );
  }, [features, searchQuery]);

  const visitedCount = useMemo(() => {
    return features.filter((f) => {
      const regionStatus = places[activeCountry]?.regions?.[f.regionId];
      return regionStatus === 'VISITED';
    }).length;
  }, [features, places, activeCountry]);

  return (
    <div className="region-card-grid">
      <div className="region-card-grid__content">
        <div className="region-card-grid__header">
          <span className="region-card-grid__count">
            {visitedCount} / {features.length} regions visited
          </span>
        </div>
        <div className="region-card-grid__cards">
          {filteredFeatures.map((rf) => {
            const regionStatus = places[activeCountry]?.regions?.[rf.regionId] || 'NONE';
            return (
              <RegionCard
                key={rf.regionId}
                activeCountry={activeCountry}
                regionFeature={rf}
                status={regionStatus}
                onSetRegionStatus={onSetRegionStatus}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const RegionCardGrid = memo(RegionCardGridBase);
