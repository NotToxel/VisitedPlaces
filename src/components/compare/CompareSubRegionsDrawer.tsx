import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Heart, RefreshCw, X } from 'lucide-react';
import type { PlaceStatus, UserPlacesMap } from '../../store/useStore';
import { fetchSubRegions } from '../../utils/topojsonCache';
import type { TopoRegion } from '../../utils/topojsonCache';

// ── Slide-over Sub-regions Comparison Drawer ───────────────────────

interface CompareSubRegionsDrawerProps {
  countryId: string;
  onClose: () => void;
  myPlaces: UserPlacesMap;
  friends: { id: string; name: string; places: UserPlacesMap }[];
  countryData: Record<string, { name: string; flag: string }>;
}

export const CompareSubRegionsDrawer: React.FC<CompareSubRegionsDrawerProps> = ({
  countryId,
  onClose,
  myPlaces,
  friends,
  countryData
}) => {
  const [regions, setRegions] = useState<TopoRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'diffs' | 'mutual' | 'mutual-wishlist' | 'wishlist' | 'avoid'>('all');

  const countryInfo = countryData[countryId];
  const allUsers = useMemo(() => [{ name: 'Me', places: myPlaces }, ...friends], [myPlaces, friends]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSubRegions(countryId).then(data => {
      if (active) {
        setRegions(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [countryId]);

  // Calculate traveler stats
  const travelerStats = useMemo(() => {
    if (regions.length === 0) return [];

    return allUsers.map((u) => {
      let visited = 0;
      let wishlist = 0;
      let avoid = 0;

      regions.forEach((reg) => {
        let status = u.places[countryId]?.regions?.[reg.id];
        if (status === undefined) status = u.places[reg.id]?.status;

        if (status === 'VISITED' || status === 'REVISIT') visited++;
        else if (status === 'WISHLIST') wishlist++;
        else if (status === 'AVOID') avoid++;
      });

      const total = regions.length;
      const percent = total > 0 ? Math.round((visited / total) * 100) : 0;
      return {
        name: u.name,
        visited,
        wishlist,
        avoid,
        percent
      };
    });
  }, [regions, allUsers, countryId]);

  // Count matching sub-regions for each filter
  const filterCounts = useMemo(() => {
    let diffs = 0;
    let mutual = 0;
    let mutualWishlist = 0;
    let anyWishlist = 0;
    let anyAvoid = 0;

    regions.forEach((reg) => {
      const statuses = allUsers.map(u => {
        let status = u.places[countryId]?.regions?.[reg.id];
        if (status === undefined) status = u.places[reg.id]?.status;
        return status || 'NONE';
      });

      if (new Set(statuses).size > 1) diffs++;
      if (statuses.every(s => s === 'VISITED' || s === 'REVISIT')) mutual++;
      if (statuses.every(s => s === 'WISHLIST')) mutualWishlist++;
      if (statuses.some(s => s === 'WISHLIST')) anyWishlist++;
      if (statuses.some(s => s === 'AVOID')) anyAvoid++;
    });

    return { diffs, mutual, mutualWishlist, anyWishlist, anyAvoid };
  }, [regions, allUsers, countryId]);

  // Filter regions based on search query & filters
  const filteredRegions = useMemo(() => {
    let result = regions;

    // 1. Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(q));
    }

    // 2. Tab filter
    if (activeFilter !== 'all') {
      result = result.filter((reg) => {
        const statuses = allUsers.map(u => {
          let status = u.places[countryId]?.regions?.[reg.id];
          if (status === undefined) status = u.places[reg.id]?.status;
          return status || 'NONE';
        });

        if (activeFilter === 'diffs') {
          return new Set(statuses).size > 1;
        }
        if (activeFilter === 'mutual') {
          return statuses.every(s => s === 'VISITED' || s === 'REVISIT');
        }
        if (activeFilter === 'mutual-wishlist') {
          return statuses.every(s => s === 'WISHLIST');
        }
        if (activeFilter === 'wishlist') {
          return statuses.some(s => s === 'WISHLIST');
        }
        if (activeFilter === 'avoid') {
          return statuses.some(s => s === 'AVOID');
        }
        return true;
      });
    }

    return result;
  }, [regions, searchQuery, activeFilter, allUsers, countryId]);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (name.toUpperCase() === 'ME') return 'ME';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get avatar border color class/color based on index
  const getAvatarColor = (idx: number) => {
    const colors = [
      'var(--accent-primary)',
      'var(--accent-visited)',
      'var(--accent-wishlist)',
      'var(--accent-revisit)'
    ];
    return colors[idx % colors.length];
  };

  // Render status badge with lucide vector icon
  const renderStatusBadge = (status: PlaceStatus) => {
    if (status === 'NONE') {
      return (
        <span className="compare-badge compare-badge--none" title="Not Checked">
          <span className="compare-badge__none-dash">-</span>
        </span>
      );
    }

    let iconComp = null;
    let className = 'compare-badge ';
    let tooltip = '';

    if (status === 'VISITED') {
      iconComp = <Check size={11} strokeWidth={3} />;
      className += 'compare-badge--visited';
      tooltip = 'Visited';
    } else if (status === 'WISHLIST') {
      iconComp = <Heart size={11} fill="currentColor" />;
      className += 'compare-badge--wishlist';
      tooltip = 'Wishlist';
    } else if (status === 'REVISIT') {
      iconComp = <RefreshCw size={11} strokeWidth={3} />;
      className += 'compare-badge--revisit';
      tooltip = 'Want to Revisit';
    } else if (status === 'AVOID') {
      iconComp = <AlertCircle size={11} strokeWidth={3} />;
      className += 'compare-badge--avoid';
      tooltip = 'Avoid';
    }

    return (
      <span className={className} title={tooltip}>
        {iconComp}
      </span>
    );
  };

  return (
    <div className="compare-drawer">
      {/* Overlay to close */}
      <div className="compare-drawer__overlay" onClick={onClose} />

      {/* Main slide-in panel */}
      <div className="compare-drawer__content glass-panel border border-base-300/40">
        <div className="compare-drawer__header">
          <div className="compare-drawer__title-container">
            {countryInfo?.flag && (
              <img src={countryInfo.flag} alt="" className="flag-image--shape compare-drawer__flag" />
            )}
            <h3 className="compare-drawer__title">{countryInfo?.name || countryId} Sub-regions</h3>
          </div>
          <button className="compare-drawer__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Coverage stats header widget */}
        {!loading && regions.length > 0 && (
          <div className="compare-drawer__stats">
            <span className="compare-drawer__stats-title">Sub-region Coverage</span>
            <div className="compare-drawer__stats-list">
              {travelerStats.map((stat, idx) => (
                <div key={idx} className="compare-drawer__stat-row">
                  <div className="compare-drawer__stat-info">
                    <span className="compare-drawer__stat-name">{stat.name}</span>
                    <span className="compare-drawer__stat-values">
                      {stat.visited} / {regions.length} ({stat.percent}%)
                    </span>
                  </div>
                  <div className="compare-drawer__progress">
                    <div
                      className="compare-drawer__progress-bar"
                      style={{
                        width: `${stat.percent}%`,
                        background: getAvatarColor(idx)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter pills container */}
        <div className="compare-drawer__controls">
          <input
            type="text"
            placeholder="Search sub-regions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="compare-drawer__search-input"
          />

          <div className="compare-drawer__filters">
            <button
              onClick={() => setActiveFilter('all')}
              className={`compare-drawer__filter-btn ${activeFilter === 'all' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              All ({regions.length})
            </button>
            <button
              onClick={() => setActiveFilter('diffs')}
              className={`compare-drawer__filter-btn ${activeFilter === 'diffs' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Different ({filterCounts.diffs})
            </button>
            <button
              onClick={() => setActiveFilter('mutual')}
              className={`compare-drawer__filter-btn ${activeFilter === 'mutual' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Mutual Visited ({filterCounts.mutual})
            </button>
            <button
              onClick={() => setActiveFilter('mutual-wishlist')}
              className={`compare-drawer__filter-btn ${activeFilter === 'mutual-wishlist' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Mutual Wishlist ({filterCounts.mutualWishlist})
            </button>
            <button
              onClick={() => setActiveFilter('wishlist')}
              className={`compare-drawer__filter-btn ${activeFilter === 'wishlist' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Any Wishlist ({filterCounts.anyWishlist})
            </button>
            <button
              onClick={() => setActiveFilter('avoid')}
              className={`compare-drawer__filter-btn ${activeFilter === 'avoid' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Any Avoid ({filterCounts.anyAvoid})
            </button>
          </div>
        </div>

        {/* Matrix comparison list */}
        <div className="compare-drawer__body">
          {loading ? (
            <div className="compare-drawer__loading">
              <span className="loading loading-spinner text-primary"></span>
              <span>Loading sub-regions...</span>
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="compare-drawer__empty">
              {searchQuery || activeFilter !== 'all'
                ? "No matching sub-regions found."
                : "No sub-regions mapped."}
            </div>
          ) : (
            <div className="compare-drawer__table-wrapper">
              <table className="compare-drawer__table">
                <thead>
                  <tr>
                    <th>Sub-region</th>
                    {allUsers.map((u, idx) => (
                      <th key={idx}>
                        <div className="compare-drawer__header-cell" title={u.name}>
                          <div
                            className="compare-drawer__avatar"
                            style={{ borderColor: getAvatarColor(idx) }}
                          >
                            {getInitials(u.name)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRegions.map(reg => {
                    return (
                      <tr key={reg.id}>
                        <td className="compare-drawer__td-name" title={reg.name}>
                          {reg.name}
                        </td>
                        {allUsers.map((u, idx) => {
                          // Try nested schema first
                          let status = u.places[countryId]?.regions?.[reg.id];
                          // Fallback to flat schema if undefined
                          if (status === undefined) {
                            status = u.places[reg.id]?.status;
                          }
                          return (
                            <td key={idx} className="compare-drawer__td-status">
                              {renderStatusBadge(status || 'NONE')}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
