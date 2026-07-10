import React, { memo, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { Check, Heart, Ban, RotateCcw } from 'lucide-react';
import type { NERegionFeature, NEFeature } from '../../data/naturalEarthAdmin1';
import type { PlaceStatus } from '../../store/useStore';
import { getPlaceFlagUrl, getParentCountryFlagUrl } from '../../utils/flagUtils';
import { COUNTRIES } from '../../data/countries';

interface RegionCardGridProps {
  activeCountry: string;
  features: NERegionFeature[];
  places: Record<string, { status: PlaceStatus; regions?: Record<string, PlaceStatus> }>;
  onSetRegionStatus: (countryId: string, regionId: string, status: PlaceStatus) => void;
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

interface GeometryWithCoords {
  coordinates: unknown;
}

function shiftCoordinatesIfWrapped(coords: unknown): unknown {
  const cloned = JSON.parse(JSON.stringify(coords));
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

  check(cloned);

  if (hasPositive && hasNegative) {
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
    shift(cloned);
  }

  return cloned;
}

/** Compute the SVG path string for a single NE feature, fitted to the card dimensions. */
function computeRegionPath(feature: NEFeature): string | null {
  try {
    const geoFeature = JSON.parse(JSON.stringify(feature)) as unknown as GeoJSON.Feature;
    if (geoFeature.geometry && 'coordinates' in geoFeature.geometry) {
      const geom = geoFeature.geometry as unknown as GeometryWithCoords;
      geom.coordinates = shiftCoordinatesIfWrapped(geom.coordinates);
    }
    const projection = geoMercator().fitExtent(
      [[SVG_PADDING, SVG_PADDING], [CARD_SVG_WIDTH - SVG_PADDING, CARD_SVG_HEIGHT - SVG_PADDING]],
      geoFeature
    );
    const pathGen = geoPath(projection);
    return pathGen(geoFeature) || null;
  } catch {
    return null;
  }
}

function getStatusColor(status: PlaceStatus): string {
  switch (status) {
    case 'VISITED': return 'var(--accent-visited)';
    case 'WISHLIST': return 'var(--accent-wishlist)';
    case 'AVOID': return 'var(--accent-avoid)';
    case 'REVISIT': return 'var(--accent-revisit)';
    default: return 'var(--map-fill-unselected)';
  }
}

interface RegionCardProps {
  activeCountry: string;
  regionFeature: NERegionFeature;
  status: PlaceStatus;
  countryCca2: string;
  onSetRegionStatus: (countryId: string, regionId: string, status: PlaceStatus) => void;
}

const RegionCardBase: React.FC<RegionCardProps> = ({
  activeCountry,
  regionFeature,
  status,
  countryCca2,
  onSetRegionStatus,
}) => {
  const { regionId, displayName, feature } = regionFeature;

  const svgPath = useMemo(() => computeRegionPath(feature), [feature]);

  const flagUrl = useMemo(() => {
    return getPlaceFlagUrl(regionId) || `https://flagcdn.com/${countryCca2.toLowerCase()}.svg`;
  }, [regionId, countryCca2]);

  const handleMapClick = useCallback(() => {
    const nextStatus = status === 'VISITED' ? 'NONE' : 'VISITED';
    onSetRegionStatus(activeCountry, regionId, nextStatus);
  }, [activeCountry, regionId, status, onSetRegionStatus]);

  const handleStatusClick = useCallback((s: PlaceStatus) => {
    onSetRegionStatus(activeCountry, regionId, status === s ? 'NONE' : s);
  }, [activeCountry, regionId, status, onSetRegionStatus]);

  const statusModifier = status !== 'NONE' ? `region-card--${status.toLowerCase()}` : '';

  return (
    <div className={`region-card ${statusModifier}`}>
      <svg
        className="region-card__map"
        viewBox={`0 0 ${CARD_SVG_WIDTH} ${CARD_SVG_HEIGHT}`}
        onClick={handleMapClick}
      >
        {svgPath ? (
          <path
            d={svgPath}
            fill={getStatusColor(status)}
            stroke="var(--map-stroke)"
            strokeWidth={0.6}
            className="region-card__shape"
          />
        ) : (
          <circle
            cx={CARD_SVG_WIDTH / 2}
            cy={CARD_SVG_HEIGHT / 2}
            r={8}
            fill={getStatusColor(status)}
            stroke="var(--map-stroke)"
            strokeWidth={0.6}
            className="region-card__shape"
          />
        )}
      </svg>

      <div className="region-card__info">
        <img
          src={flagUrl}
          alt=""
          className="region-card__flag cursor-pointer"
          title="Click flag to instantly toggle Visited status"
          onClick={(e) => {
            e.stopPropagation();
            handleMapClick();
          }}
          onError={(e) => {
            const parentFlag = getParentCountryFlagUrl(regionId);
            if (parentFlag && e.currentTarget.src !== parentFlag) {
              e.currentTarget.src = parentFlag;
            }
          }}
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
}) => {
  const countryCca2 = useMemo(() => {
    const country = COUNTRIES.find((c) => c.id === activeCountry);
    if (country) return country.cca2.toLowerCase();

    const territoryCca2Map: Record<string, string> = {
      'ATF': 'tf',
      'NCL': 'nc',
      'GRL': 'gl',
      'ESH': 'eh',
      'FRO': 'fo',
      'FLK': 'fk',
      'SJM': 'sj',
      'ALA': 'ax',
      'PYF': 'pf',
      'COK': 'ck',
      'SHN': 'sh',
      'WLF': 'wf'
    };
    return territoryCca2Map[activeCountry] || '';
  }, [activeCountry]);

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
          <span className="region-card-grid__hint">
            Click a region shape to toggle visited
          </span>
        </div>
        <div className="region-card-grid__cards">
          {features.map((rf) => {
            const regionStatus = places[activeCountry]?.regions?.[rf.regionId] || 'NONE';
            return (
              <RegionCard
                key={rf.regionId}
                activeCountry={activeCountry}
                regionFeature={rf}
                status={regionStatus}
                countryCca2={countryCca2}
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
