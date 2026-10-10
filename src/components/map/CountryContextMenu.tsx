import React, { useEffect, useRef } from 'react';
import { Check, Heart, RotateCcw, Ban, X, ChevronRight, Home } from 'lucide-react';
import { COUNTRIES } from '../../data/countries';
import type { PlaceStatus } from '../../store/useStore';
import { useStore } from '../../store/useStore';
import { hasDrilldownSupport } from '../../utils/topojsonCache';
import { FlagImage } from '../common/FlagImage';
import { ResidencyPeriodEditor } from '../common/ResidencyPeriodEditor';

interface CountryContextMenuProps {
  countryId: string;
  displayName?: string;
  currentStatus: PlaceStatus;
  x: number;
  y: number;
  onSetStatus: (countryId: string, status: PlaceStatus) => void;
  onDrillDown: (countryId: string) => void;
  onClose: () => void;
}

export const CountryContextMenu: React.FC<CountryContextMenuProps> = ({
  countryId,
  displayName,
  currentStatus,
  x,
  y,
  onSetStatus,
  onDrillDown,
  onClose,
}) => {
  const { places, livedTrackingEnabled, setCountryLived, setCountryPeriods } = useStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const country = COUNTRIES.find((c) => c.id === countryId);
  const resolvedName = displayName || country?.name || countryId;

  const hasDrillDown = hasDrilldownSupport(countryId);
  const placeData = places[countryId];
  const isLived = Boolean(placeData?.lived);
  const periods = placeData?.periods || [];

  // Reposition if overflowing viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;

    if (rect.right > window.innerWidth - 12) {
      el.style.left = `${window.innerWidth - rect.width - 12}px`;
    }
    if (rect.bottom > window.innerHeight - 12) {
      el.style.top = `${window.innerHeight - rect.height - 12}px`;
    }
    if (rect.left < 12) {
      el.style.left = '12px';
    }
    if (rect.top < 12) {
      el.style.top = '12px';
    }
  }, [x, y, isLived, periods.length]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  const statusOptions: { status: PlaceStatus; label: string; icon: React.ReactNode }[] = [
    { status: 'VISITED', label: 'Visited', icon: <Check size={16} /> },
    { status: 'WISHLIST', label: 'Wishlist', icon: <Heart size={16} /> },
    { status: 'REVISIT', label: 'Revisit', icon: <RotateCcw size={16} /> },
    { status: 'AVOID', label: 'Avoid', icon: <Ban size={16} /> },
  ];

  const handleStatusClick = (status: PlaceStatus) => {
    if (currentStatus === status) {
      onSetStatus(countryId, 'NONE');
    } else {
      onSetStatus(countryId, status);
    }
  };

  return (
    <div
      ref={menuRef}
      className="country-context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="country-context-menu__header">
        <div className="country-context-menu__country-info">
          <FlagImage
            placeId={countryId}
            className="country-context-menu__flag"
          />
          <span className="country-context-menu__name">
            {resolvedName}
          </span>
        </div>

        <button
          className="country-context-menu__close"
          onClick={onClose}
          title="Close"
        >
          <X size={17} />
        </button>
      </div>

      {/* Status Buttons */}
      <div className="country-context-menu__actions">
        {statusOptions.map(({ status, label, icon }) => {
          const isActive = currentStatus === status;
          return (
            <button
              key={status}
              className={`country-context-menu__status-btn country-context-menu__status-btn--${status.toLowerCase()} ${isActive ? 'country-context-menu__status-btn--active' : ''}`}
              onClick={() => handleStatusClick(status)}
              title={isActive ? `Clear ${label}` : `Mark as ${label}`}
              aria-pressed={isActive}
            >
              {icon}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Lived Section (Only when feature enabled in settings) */}
      {livedTrackingEnabled && (
        <div className="country-context-menu__lived-section">
          <label className="country-context-menu__lived-toggle">
            <div className="country-context-menu__lived-label">
              <Home size={15} />
              <span>I have lived here</span>
            </div>
            <input
              type="checkbox"
              className="survey-checkbox"
              checked={isLived}
              onChange={(e) => {
                const next = e.target.checked;
                setCountryLived(countryId, next);
                if (next && currentStatus === 'NONE') {
                  onSetStatus(countryId, 'VISITED');
                }
              }}
              aria-label={`Mark ${resolvedName} as lived in`}
            />
          </label>

          {isLived && (
            <div className="country-context-menu__period-wrapper">
              <ResidencyPeriodEditor
                periods={periods}
                onChange={(newPeriods) => setCountryPeriods(countryId, newPeriods)}
                placeName={resolvedName}
                compact
              />
            </div>
          )}
        </div>
      )}

      {/* Drill-Down Button */}
      {hasDrillDown && (
        <button
          className="country-context-menu__drilldown"
          onClick={() => {
            onDrillDown(countryId);
            onClose();
          }}
        >
          <span>Explore regions</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
