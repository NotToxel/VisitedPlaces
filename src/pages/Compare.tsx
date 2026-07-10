import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { UserPlacesMap, PlaceStatus } from '../store/useStore';
import { COUNTRIES, NUMERIC_TO_A3 } from '../data/countries';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { MICROSTATES } from '../data/mapData';
import { getAllTerritories } from '../data/territoriesRegistry';
import { fetchSubRegions, hasDrilldownSupport } from '../utils/topojsonCache';
import type { TopoRegion } from '../utils/topojsonCache';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Users,
  Heart,
  Globe,
  Eye,
  ShieldAlert,
  Sparkles,
  GraduationCap,
  X,
  Palette,
  ChevronDown,
  ChevronRight,
  Share2,
  RefreshCw,
  Pencil,
  AlertCircle
} from 'lucide-react';

export interface MapCompareResult {
  type: 'EVERYONE_VISITED' | 'MOST_VISITED' | 'ONLY_ME_VISITED' | 'THEY_VISITED' | 'EVERYONE_WISHLIST' | 'MIXED_WISHLIST' | 'EVERYONE_AVOID' | 'EVERYONE_REVISIT' | 'MIXED_REVISIT' | 'NONE';
  label: string;
  count: number;
  totalUsers: number;
}

interface FriendData {
  id: string;
  name: string;
  places: UserPlacesMap;
}

interface CompareGroup {
  id: string;
  name: string;
  friends: FriendData[];
}

const Compare: React.FC = () => {
  const { places: myPlaces } = useStore();
  const [copied, setCopied] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [legendOpen, setLegendOpen] = useState(false);

  // Inline group management states (no browser dialogs)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);
  const editGroupInputRef = useRef<HTMLInputElement>(null);

  // Inline error/warning notifications state (replaces native alerts)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sub-regions drawer state
  const [selectedCompareCountryId, setSelectedCompareCountryId] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => {
      setErrorMsg(prev => prev === msg ? null : prev);
    }, 5000);
  }, []);

  // Load groups from localStorage, or initialize with an empty list
  const [groups, setGroups] = useState<CompareGroup[]>(() => {
    try {
      const saved = localStorage.getItem('visited-places-compare-groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy empty default groups to prevent showing them by default
          return parsed.filter(g => g.id !== 'default' || g.friends.length > 0);
        }
      }
    } catch (e) {
      console.warn("Could not load compare groups", e);
    }
    return [];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('visited-places-active-group-id');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return '';
  });

  // Save to localStorage when groups/activeGroup change
  useEffect(() => {
    localStorage.setItem('visited-places-compare-groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('visited-places-active-group-id', activeGroupId);
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find(g => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  // Sync activeGroupId if it points to nothing or is empty
  useEffect(() => {
    if (activeGroup && activeGroup.id !== activeGroupId) {
      setActiveGroupId(activeGroup.id);
    }
  }, [activeGroup, activeGroupId]);

  const friends = useMemo(() => {
    return activeGroup ? activeGroup.friends : [];
  }, [activeGroup]);

  const myShareCode = useMemo(() => serializePlaces(myPlaces), [myPlaces]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myShareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    const inputCode = friendInput.trim();
    if (!inputCode) return;

    if (inputCode === myShareCode) {
      showError("This is your own share code! You don't need to add yourself to the comparison.");
      return;
    }

    const isAlreadyAdded = friends.some(f => serializePlaces(f.places) === inputCode);
    if (isAlreadyAdded) {
      showError("This friend has already been added to this comparison group.");
      return;
    }

    const deserialized = deserializePlaces(inputCode);
    if (deserialized) {
      setGroups(prev => {
        // If there are no groups, create the first group
        if (prev.length === 0) {
          const newGroupId = Math.random().toString(36).substring(7);
          const newGroup: CompareGroup = {
            id: newGroupId,
            name: 'Group 1',
            friends: [{
              id: Math.random().toString(36).substring(7),
              name: 'Friend 1',
              places: deserialized
            }]
          };
          setActiveGroupId(newGroupId);
          return [newGroup];
        }

        // If active group is not found, default to first group
        const targetGroupId = activeGroupId || prev[0].id;
        return prev.map(g => {
          if (g.id === targetGroupId) {
            return {
              ...g,
              friends: [...g.friends, {
                id: Math.random().toString(36).substring(7),
                name: `Friend ${g.friends.length + 1}`,
                places: deserialized
              }]
            };
          }
          return g;
        });
      });
      setFriendInput('');
    } else {
      showError("Invalid share code. Please check and try again.");
    }
  };

  const removeFriend = (friendId: string) => {
    if (!activeGroup) return;
    setGroups(prev => {
      const updated = prev.map(g => {
        if (g.id === activeGroup.id) {
          return {
            ...g,
            friends: g.friends.filter(f => f.id !== friendId)
          };
        }
        return g;
      });
      // Filter out any groups that now have 0 friends to self-delete
      return updated.filter(g => g.friends.length > 0);
    });
  };

  const renameFriend = (friendId: string, newName: string) => {
    if (!activeGroup) return;
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          friends: g.friends.map(f => f.id === friendId ? { ...f, name: newName } : f)
        };
      }
      return g;
    }));
  };

  const handleStartCreateGroup = useCallback(() => {
    setIsCreatingGroup(true);
    setNewGroupName('');
    setTimeout(() => newGroupInputRef.current?.focus(), 50);
  }, []);

  const handleConfirmCreateGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) {
      setIsCreatingGroup(false);
      return;
    }
    const newId = Math.random().toString(36).substring(7);
    const newGroup: CompareGroup = {
      id: newId,
      name,
      friends: []
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newId);
    setIsCreatingGroup(false);
    setNewGroupName('');
  }, [newGroupName]);

  const handleStartRenameGroup = useCallback((groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditGroupName(currentName);
    setTimeout(() => editGroupInputRef.current?.focus(), 50);
  }, []);

  const handleConfirmRenameGroup = useCallback(() => {
    if (!editingGroupId) return;
    const name = editGroupName.trim();
    if (name) {
      setGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name } : g));
    }
    setEditingGroupId(null);
    setEditGroupName('');
  }, [editingGroupId, editGroupName]);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingGroupId || groups.length <= 1) return;
    const remaining = groups.filter(g => g.id !== deletingGroupId);
    setGroups(remaining);
    if (activeGroupId === deletingGroupId) {
      setActiveGroupId(remaining[0].id);
    }
    setDeletingGroupId(null);
  }, [deletingGroupId, groups, activeGroupId]);

  const mergedData = useMemo(() => {
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const totalUsers = allUsers.length;
    const result: Record<string, MapCompareResult> = {};

    // Gather all uniquely mentioned countries, microstates, and territories
    const allCountryCodes = new Set<string>();
    const allTerritories = getAllTerritories();
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      const isMicrostateOrTerritory =
        MICROSTATES.some(m => m.id === code) ||
        allTerritories.some(t => t.id === code);
      if (!code.includes('-') || isMicrostateOrTerritory) {
        allCountryCodes.add(code);
      }
    }));

    allCountryCodes.forEach(code => {
      let visitedCount = 0;
      let wishlistCount = 0;
      let avoidCount = 0;
      let revisitCount = 0;
      const iVisited = myPlaces[code]?.status === 'VISITED';
      const iRevisit = myPlaces[code]?.status === 'REVISIT';

      allUsers.forEach(u => {
        const status = u.places[code]?.status;
        if (status === 'VISITED') visitedCount++;
        if (status === 'WISHLIST') wishlistCount++;
        if (status === 'AVOID') avoidCount++;
        if (status === 'REVISIT') revisitCount++;
      });

      if (visitedCount === 0 && wishlistCount === 0 && avoidCount === 0 && revisitCount === 0) return;

      let type: MapCompareResult['type'] = 'NONE';
      let label = '';

      if (visitedCount === totalUsers) {
        type = 'EVERYONE_VISITED';
        label = 'Everyone Visited';
      } else if (revisitCount === totalUsers) {
        type = 'EVERYONE_REVISIT';
        label = 'Everyone Revisit';
      } else if (visitedCount + revisitCount === totalUsers) {
        type = 'MOST_VISITED';
        label = 'Visited & Revisit';
      } else if (revisitCount > 0) {
        type = 'MIXED_REVISIT';
        label = 'Revisit by Some';
      } else if (visitedCount > 1) {
        type = 'MOST_VISITED';
        label = 'Most Visited';
      } else if (visitedCount === 1) {
        type = (iVisited || iRevisit) ? 'ONLY_ME_VISITED' : 'THEY_VISITED';
        label = (iVisited || iRevisit) ? 'Only I Visited' : 'Someone Visited';
      } else if (wishlistCount === totalUsers) {
        type = 'EVERYONE_WISHLIST';
        label = 'Everyone Wishlisted';
      } else if (wishlistCount > 0) {
        type = 'MIXED_WISHLIST';
        label = 'Wishlisted by Some';
      } else if (avoidCount === totalUsers) {
        type = 'EVERYONE_AVOID';
        label = 'Everyone Avoids';
      }

      result[code] = {
        type,
        label,
        count: (visitedCount > 0 || revisitCount > 0) ? (visitedCount + revisitCount) : (wishlistCount > 0 ? wishlistCount : avoidCount),
        totalUsers
      };
    });

    return result;
  }, [myPlaces, friends]);

  // Redefined countryData lookup map to also support territories and microstates
  const countryData = useMemo(() => {
    const map: Record<string, { name: string, flag: string }> = {};
    COUNTRIES.forEach(c => {
      map[c.id] = { name: c.name, flag: c.flag };
    });
    // Add microstates
    MICROSTATES.forEach(m => {
      if (!map[m.id]) {
        map[m.id] = {
          name: m.name,
          flag: m.flagCode ? `https://flagcdn.com/${m.flagCode}.svg` : ''
        };
      }
    });
    // Add territories
    const allTerritories = getAllTerritories();
    allTerritories.forEach(t => {
      if (!map[t.id]) {
        map[t.id] = {
          name: t.name,
          flag: t.flagCode ? `https://flagcdn.com/${t.flagCode}.svg` : ''
        };
      }
    });
    return map;
  }, []);

  // Aggregate Analytics
  const commonVisited = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_VISITED');
  const commonRevisit = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_REVISIT');
  const commonWishlist = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_WISHLIST');
  const commonAvoid = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_AVOID');
  const onlyMeVisited = Object.entries(mergedData).filter(([, r]) => r.type === 'ONLY_ME_VISITED');
  const theyVisited = Object.entries(mergedData).filter(([, r]) => r.type === 'THEY_VISITED');

  // Travel compatibility score
  const compatibilityScore = useMemo(() => {
    if (friends.length === 0) return 0;
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const allCodes = new Set<string>();
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      const status = u.places[code]?.status;
      if (status && status !== 'NONE') allCodes.add(code);
    }));
    if (allCodes.size === 0) return 0;
    let mutualCount = 0;
    allCodes.forEach(code => {
      const statuses = allUsers.map(u => u.places[code]?.status).filter(Boolean);
      const allSame = statuses.length === allUsers.length && statuses.every(s => s === statuses[0]);
      if (allSame) mutualCount++;
    });
    return Math.round((mutualCount / allCodes.size) * 100);
  }, [myPlaces, friends]);

  // Complex Analytics
  const topWantedUnvisited = useMemo(() => {
    return Object.keys(mergedData)
      .map((code) => {
        let visited = 0;
        let wlist = 0;
        if (myPlaces[code]?.status === 'VISITED' || myPlaces[code]?.status === 'REVISIT') visited++;
        if (myPlaces[code]?.status === 'WISHLIST') wlist++;
        friends.forEach(f => {
          if (f.places[code]?.status === 'VISITED' || f.places[code]?.status === 'REVISIT') visited++;
          if (f.places[code]?.status === 'WISHLIST') wlist++;
        });
        return { code, visited, wishlist: wlist };
      })
      .filter(item => item.visited === 0 && item.wishlist > 1)
      .sort((a, b) => b.wishlist - a.wishlist)
      .slice(0, 5);
  }, [mergedData, myPlaces, friends]);

  const wantedButVisited = useMemo(() => {
    return Object.keys(mergedData)
      .map((code) => {
        let visited = 0;
        let wlist = 0;
        const whoVisited: string[] = [];
        const whoWants: string[] = [];

        if (myPlaces[code]?.status === 'VISITED' || myPlaces[code]?.status === 'REVISIT') {
          visited++;
          whoVisited.push('Me');
        }
        if (myPlaces[code]?.status === 'WISHLIST') {
          wlist++;
          whoWants.push('Me');
        }

        friends.forEach(f => {
          if (f.places[code]?.status === 'VISITED' || f.places[code]?.status === 'REVISIT') {
            visited++;
            whoVisited.push(f.name);
          }
          if (f.places[code]?.status === 'WISHLIST') {
            wlist++;
            whoWants.push(f.name);
          }
        });

        return { code, visited, wishlist: wlist, whoVisited, whoWants };
      })
      .filter(item => item.visited > 0 && item.wishlist > 0)
      .sort((a, b) => b.wishlist - a.wishlist)
      .slice(0, 5);
  }, [mergedData, myPlaces, friends]);

  const hasImportedFriend = friends.length > 0;

  // ── Country pill renderer ──────────────────────────────────────────
  const renderCountryPill = (code: string) => {
    const data = countryData[code];
    const canDrilldown = hasDrilldownSupport(code);
    
    return (
      <span 
        key={code} 
        className={`compare-country-pill ${canDrilldown ? 'compare-country-pill--clickable' : ''}`}
        onClick={canDrilldown ? () => setSelectedCompareCountryId(code) : undefined}
        title={canDrilldown ? "Click to compare sub-regions" : undefined}
      >
        {data?.flag && (
          <img
            src={data.flag}
            alt=""
            className="compare-country-pill__flag"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='11'><rect width='16' height='11' fill='%23333333' opacity='0.15'/></svg>";
            }}
          />
        )}
        <span className="compare-country-pill__name">{data?.name || code}</span>
        {canDrilldown && (
          <ChevronRight size={10} className="compare-country-pill__arrow" />
        )}
      </span>
    );
  };

  // ── Country pills section renderer ────────────────────────────────
  const renderPillsSection = (
    title: string,
    color: string,
    items: [string, MapCompareResult][],
    emptyText: string
  ) => (
    <div className="compare-pills-section">
      <div className="compare-pills-section__header">
        <div className="compare-pills-section__dot" style={{ background: color }} />
        <span className="compare-pills-section__title">{title}</span>
        <span className="compare-pills-section__count">{items.length}</span>
      </div>
      <div className="compare-country-pills">
        {items.length > 0
          ? items.map(([code]) => renderCountryPill(code))
          : <span className="compare-country-pill__empty">{emptyText}</span>
        }
      </div>
    </div>
  );

  // ── Legend items ──────────────────────────────────────────────────
  const legendItems = [
    { color: 'var(--color-both)', label: 'Both Visited' },
    { color: 'var(--accent-visited)', label: 'Most Visited' },
    { color: 'var(--color-me-only)', label: 'Me Only' },
    { color: 'var(--color-they-only)', label: 'Others Only' },
    { color: 'var(--color-revisit-both)', label: 'Both Revisit' },
    { color: 'var(--color-revisit-mixed)', label: 'Some Revisit' },
    { color: 'var(--color-wishlist-both)', label: 'Both Wishlist' },
    { color: 'var(--accent-wishlist)', label: 'Some Wishlist' },
    { color: 'var(--color-avoid)', label: 'Everyone Avoids' },
  ];

  // ── Groups Grid (Landing Page Cards View) ─────────────────────────
  const renderGroupsSection = () => {
    if (groups.length === 0) return null;

    return (
      <div className="compare-groups-section">
        <span className="compare-groups-section__title">Comparison Groups</span>
        <div className="compare-groups-grid">
          {groups.map(g => {
            const isActive = g.id === activeGroupId;
            const isEditing = editingGroupId === g.id;

            return (
              <div
                key={g.id}
                className={`compare-group-card ${isActive ? 'compare-group-card--active' : ''}`}
                onClick={() => !isEditing && setActiveGroupId(g.id)}
              >
                {isEditing ? (
                  <div className="compare-group-card__inline-create" onClick={e => e.stopPropagation()}>
                    <input
                      ref={editGroupInputRef}
                      type="text"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRenameGroup();
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      className="compare-group-card__input"
                    />
                    <div className="compare-group-card__inline-create-actions">
                      <button className="btn btn-primary btn-xs" onClick={handleConfirmRenameGroup}>
                        Save
                      </button>
                      <button className="btn btn-outline btn-xs" onClick={() => setEditingGroupId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="compare-group-card__header">
                      <span className="compare-group-card__name" title={g.name}>
                        {g.name}
                      </span>
                      <span className="compare-group-card__count">
                        {g.friends.length + 1}
                      </span>
                    </div>

                    <div className="compare-group-card__members">
                      <span className="compare-group-card__member-chip compare-group-card__member-chip--me">
                        Me
                      </span>
                      {g.friends.map(f => (
                        <span key={f.id} className="compare-group-card__member-chip">
                          {f.name}
                        </span>
                      ))}
                      {g.friends.length === 0 && (
                        <span className="text-[10px] italic opacity-40">Only you</span>
                      )}
                    </div>

                    <div className="compare-group-card__footer" onClick={e => e.stopPropagation()}>
                      <button
                        className="compare-group-card__btn"
                        onClick={() => handleStartRenameGroup(g.id, g.name)}
                        title="Rename Group"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="compare-group-card__btn compare-group-card__btn--danger"
                        onClick={() => setDeletingGroupId(g.id)}
                        title="Delete Group"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {isCreatingGroup ? (
            <div className="compare-group-card" onClick={e => e.stopPropagation()}>
              <div className="compare-group-card__inline-create">
                <input
                  ref={newGroupInputRef}
                  type="text"
                  placeholder="New group name..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConfirmCreateGroup();
                    if (e.key === 'Escape') setIsCreatingGroup(false);
                  }}
                  className="compare-group-card__input"
                />
                <div className="compare-group-card__inline-create-actions">
                  <button className="btn btn-primary btn-xs" onClick={handleConfirmCreateGroup}>
                    Create
                  </button>
                  <button className="btn btn-outline btn-xs" onClick={() => setIsCreatingGroup(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="compare-group-card compare-group-card--add" onClick={handleStartCreateGroup}>
              <div className="compare-group-card__add-content">
                <div className="compare-group-card__add-ring">
                  <Plus size={16} />
                </div>
                <span>Create Group</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── EMPTY STATE ───────────────────────────────────────────────────
  if (!hasImportedFriend) {
    return (
      <div className="compare-page" style={{ overflowY: 'auto' }}>
        {/* Top bar — minimal when empty */}


        {/* Delete confirmation banner */}
        {deletingGroupId && (
          <div className="compare-delete-banner">
            <div className="compare-delete-banner__content">
              <span className="compare-delete-banner__text">
                Are you sure you want to delete the group <strong>"{groups.find(g => g.id === deletingGroupId)?.name}"</strong>? All comparisons in this group will be lost.
              </span>
              <div className="compare-delete-banner__actions">
                <button className="btn btn-error btn-xs" onClick={handleConfirmDelete}>
                  Delete Group
                </button>
                <button className="btn btn-outline btn-xs" onClick={() => setDeletingGroupId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning banner */}
        {errorMsg && (
          <div className="compare-warning-banner" style={{ margin: '12px 20px 0 20px', width: 'auto' }}>
            <div className="compare-warning-banner__content">
              <div className="compare-warning-banner__message">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
              <button
                className="compare-warning-banner__close"
                onClick={() => setErrorMsg(null)}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Empty state hero */}
        <div className="compare-empty" style={{ flex: 'none', paddingBottom: '20px' }}>
          <div className="compare-empty__icon-ring">
            <Users size={36} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2 className="compare-empty__title">Compare Travel Maps</h2>
          <p className="compare-empty__subtitle">
            Discover mutual destinations, shared wishlists, and travel compatibility
            by comparing your map with friends.
          </p>

          <div className="compare-empty__steps">
            <div className="compare-empty__step">
              <div className="compare-empty__step-number">1</div>
              <span className="compare-empty__step-text">Copy your share code and send it to a friend</span>
            </div>
            <div className="compare-empty__step">
              <div className="compare-empty__step-number">2</div>
              <span className="compare-empty__step-text">Ask your friend to send you their share code</span>
            </div>
            <div className="compare-empty__step">
              <div className="compare-empty__step-number">3</div>
              <span className="compare-empty__step-text">Paste their code below to start comparing</span>
            </div>
          </div>

          <div className="compare-empty__actions">
            <button onClick={handleCopyCode} className="btn btn-primary btn-sm" style={{ gap: '6px', paddingInline: '20px' }}>
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              {copied ? 'Copied!' : 'Copy My Share Code'}
            </button>
            <div className="compare-empty__code-input">
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Paste a friend's share code here..."
                value={friendInput}
                onChange={e => setFriendInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                style={{ fontSize: '0.78rem' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddFriend} style={{ gap: '4px' }}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Premium Groups Grid in the empty state */}
        {renderGroupsSection()}
      </div>
    );
  }

  // ── ACTIVE COMPARISON STATE ───────────────────────────────────────
  return (
    <div className="compare-page compare-page--scrollable">
      <div className="compare-dashboard__container compare-dashboard__container--active">
        {/* Delete confirmation banner */}
        {deletingGroupId && (
          <div className="compare-delete-banner compare-delete-banner--contained">
            <div className="compare-delete-banner__content">
              <span className="compare-delete-banner__text">
                Are you sure you want to delete the group <strong>"{groups.find(g => g.id === deletingGroupId)?.name}"</strong>? All comparisons in this group will be lost.
              </span>
              <div className="compare-delete-banner__actions">
                <button className="btn btn-error btn-xs" onClick={handleConfirmDelete}>
                  Delete Group
                </button>
                <button className="btn btn-outline btn-xs" onClick={() => setDeletingGroupId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning banner */}
        {errorMsg && (
          <div className="compare-warning-banner">
            <div className="compare-warning-banner__content">
              <div className="compare-warning-banner__message">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
              <button
                className="compare-warning-banner__close"
                onClick={() => setErrorMsg(null)}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Zone 1: Header Control Card ────────────────────────────── */}
        <div className="compare-header-card">
          <div className="compare-header-card__top">
            <span className="compare-header-card__title">Compare Maps</span>

            {/* Centered Search/Paste input */}
            <div className="compare-header-card__input-wrapper">
              <input
                type="text"
                className="input input-bordered input-sm"
                placeholder="Paste a friend's share code..."
                value={friendInput}
                onChange={e => setFriendInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                style={{ flex: 1, fontSize: '0.8rem' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddFriend} style={{ gap: '4px' }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Share code copy */}
            <button onClick={handleCopyCode} className="btn btn-primary btn-sm compare-header-card__share-btn" style={{ gap: '4px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'My Code'}
            </button>
          </div>

          <div className="compare-header-card__divider" />

          {/* Groups & Members Bar (Space Optimized Single Line Layout) ── */}
          <div className="compare-members-bar">
            <span className="compare-members-bar__label">Groups</span>
            {groups.map(g => {
              const isActive = g.id === activeGroupId;
              const isEditing = editingGroupId === g.id;

              return (
                <div
                  key={g.id}
                  className={`compare-group-tab ${isActive ? 'compare-group-tab--active' : ''}`}
                  onClick={() => !isEditing && setActiveGroupId(g.id)}
                >
                  {isEditing ? (
                    <input
                      ref={editGroupInputRef}
                      type="text"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      onBlur={handleConfirmRenameGroup}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRenameGroup();
                        if (e.key === 'Escape') setEditingGroupId(null);
                      }}
                      className="compare-group-tab__rename-input"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span>{g.name}</span>
                      <span className="compare-group-tab__count">{g.friends.length + 1}</span>
                      {isActive && (
                        <div className="compare-group-tab__actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="compare-group-tab__action-btn"
                            onClick={() => handleStartRenameGroup(g.id, g.name)}
                            title="Rename Group"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="compare-group-tab__action-btn compare-group-tab__action-btn--danger"
                            onClick={() => setDeletingGroupId(g.id)}
                            title="Delete Group"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {isCreatingGroup ? (
              <div className="compare-group-create" onClick={e => e.stopPropagation()}>
                <input
                  ref={newGroupInputRef}
                  type="text"
                  placeholder="Group name..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConfirmCreateGroup();
                    if (e.key === 'Escape') setIsCreatingGroup(false);
                  }}
                  className="compare-group-create__input"
                />
                <button
                  className="compare-group-create__btn compare-group-create__btn--confirm"
                  onClick={handleConfirmCreateGroup}
                  title="Create Group"
                >
                  <Check size={12} />
                </button>
                <button
                  className="compare-group-create__btn compare-group-create__btn--cancel"
                  onClick={() => setIsCreatingGroup(false)}
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button className="compare-group-add-btn" onClick={handleStartCreateGroup}>
                <Plus size={12} />
              </button>
            )}

            <div className="compare-topbar__divider" style={{ height: '18px', marginInline: '8px' }} />

            <span className="compare-members-bar__label">Members</span>
            <div className="compare-member-chip compare-member-chip--me">
              <span className="compare-member-chip__name">Me</span>
            </div>
            {friends.map(f => (
              <div key={f.id} className="compare-member-chip">
                <input
                  type="text"
                  value={f.name}
                  onChange={(e) => renameFriend(f.id, e.target.value)}
                  className="compare-member-chip__edit"
                  title="Click to rename"
                />
                <button
                  onClick={() => removeFriend(f.id)}
                  className="compare-member-chip__remove"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Zone 2: Map Card ────────────────────────────────────────── */}
        <div className="compare-map-card">
          <CompareMap mergedData={mergedData} numericToA3={NUMERIC_TO_A3} />

          {/* Floating Legend */}
          <div className="compare-legend">
            <button
              className="compare-legend__toggle"
              onClick={() => setLegendOpen(!legendOpen)}
            >
              <Palette size={12} />
              Legend
              <ChevronDown size={10} style={{
                transform: legendOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s ease'
              }} />
            </button>
            {legendOpen && (
              <div className="compare-legend__panel">
                {legendItems.map(item => (
                  <div key={item.label} className="compare-legend__item">
                    <div className="compare-legend__dot" style={{ background: item.color }} />
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Zone 3: Analytics Dashboard Content ─────────────────────── */}
        {/* Stat Cards */}
        <span className="compare-dashboard__section-title">Overview</span>
        <div className="compare-stats-grid">
          <div className="compare-stat-card compare-stat-card--visited">
            <div className="compare-stat-card__icon"><Globe size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--color-both)' }}>
              {commonVisited.length}
            </div>
            <div className="compare-stat-card__label">Both Visited</div>
          </div>

          <div className="compare-stat-card compare-stat-card--wishlist">
            <div className="compare-stat-card__icon"><Heart size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--color-wishlist-both)' }}>
              {commonWishlist.length}
            </div>
            <div className="compare-stat-card__label">Mutual Wishlist</div>
          </div>

          <div className="compare-stat-card compare-stat-card--me-only">
            <div className="compare-stat-card__icon"><Eye size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--color-me-only)' }}>
              {onlyMeVisited.length}
            </div>
            <div className="compare-stat-card__label">Only I Visited</div>
          </div>

          <div className="compare-stat-card compare-stat-card--compat">
            <div className="compare-stat-card__icon"><Sparkles size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--accent-primary)' }}>
              {compatibilityScore}%
            </div>
            <div className="compare-stat-card__label">Travel Compatibility</div>
          </div>

          <div className="compare-stat-card compare-stat-card--revisit">
            <div className="compare-stat-card__icon"><RefreshCw size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--color-revisit-both)' }}>
              {commonRevisit.length}
            </div>
            <div className="compare-stat-card__label">Mutual Revisit</div>
          </div>

          <div className="compare-stat-card compare-stat-card--avoid">
            <div className="compare-stat-card__icon"><ShieldAlert size={32} /></div>
            <div className="compare-stat-card__value" style={{ color: 'var(--color-avoid)' }}>
              {commonAvoid.length}
            </div>
            <div className="compare-stat-card__label">Mutual Avoid</div>
          </div>
        </div>

        {/* Country Lists as Pill Chips */}
        <span className="compare-dashboard__section-title">Country Breakdown</span>

        {renderPillsSection(
          "We've All Visited",
          'var(--color-both)',
          commonVisited,
          'No mutually visited countries yet.'
        )}

        {renderPillsSection(
          'Mutual Wishlist',
          'var(--color-wishlist-both)',
          commonWishlist,
          'No shared wishlists yet.'
        )}

        {renderPillsSection(
          'Only I Visited',
          'var(--color-me-only)',
          onlyMeVisited,
          'None — your friends have been everywhere you have!'
        )}

        {renderPillsSection(
          'They Visited (Not Me)',
          'var(--color-they-only)',
          theyVisited,
          'You\'ve been everywhere they have!'
        )}

        {commonRevisit.length > 0 && renderPillsSection(
          'Mutual Revisit',
          'var(--color-revisit-both)',
          commonRevisit,
          ''
        )}

        {commonAvoid.length > 0 && renderPillsSection(
          'Everyone Avoids',
          'var(--color-avoid)',
          commonAvoid,
          ''
        )}

        {/* Insight Cards */}
        {(topWantedUnvisited.length > 0 || wantedButVisited.length > 0) && (
          <>
            <span className="compare-dashboard__section-title">Insights</span>
            <div className="compare-insights-grid">
              {/* Most Wanted */}
              {topWantedUnvisited.length > 0 && (
                <div className="compare-insight-card">
                  <div className="compare-insight-card__header">
                    <Heart size={14} className="compare-insight-card__icon" style={{ color: 'var(--accent-wishlist)' }} />
                    Most Wanted Destinations
                  </div>
                  <ul className="compare-insight-card__list">
                    {topWantedUnvisited.map(({ code, wishlist }) => (
                      <li key={code} className="compare-insight-card__item">
                        {countryData[code]?.flag && (
                          <img
                            src={countryData[code]?.flag}
                            alt=""
                            className="compare-insight-card__item-flag"
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='13'><rect width='18' height='13' fill='%23333333' opacity='0.15'/></svg>";
                            }}
                          />
                        )}
                        <span className="compare-insight-card__item-name">
                          {countryData[code]?.name || code}
                        </span>
                        <span
                          className="compare-insight-card__item-badge"
                          style={{ background: 'rgba(187, 154, 247, 0.15)', color: 'var(--accent-wishlist)' }}
                        >
                          {wishlist} ❤️
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Travel Mentorships */}
              {wantedButVisited.length > 0 && (
                <div className="compare-insight-card">
                  <div className="compare-insight-card__header">
                    <GraduationCap size={14} className="compare-insight-card__icon" style={{ color: 'var(--color-me-only)' }} />
                    Travel Mentorships
                  </div>
                  <ul className="compare-insight-card__list">
                    {wantedButVisited.map(({ code, whoVisited, whoWants }) => (
                      <li key={code}>
                        <div className="compare-insight-card__item">
                          {countryData[code]?.flag && (
                            <img
                              src={countryData[code]?.flag}
                              alt=""
                              className="compare-insight-card__item-flag"
                              onError={(e) => {
                                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='13'><rect width='18' height='13' fill='%23333333' opacity='0.15'/></svg>";
                              }}
                            />
                          )}
                          <span className="compare-insight-card__item-name">
                            {countryData[code]?.name || code}
                          </span>
                        </div>
                        <div className="compare-insight-card__item-detail">
                          <span style={{ color: 'var(--accent-visited)' }}>{whoVisited.join(', ')}</span>
                          {' visited · '}
                          <span style={{ color: 'var(--accent-wishlist)' }}>{whoWants.join(', ')}</span>
                          {' wants to go'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
        {/* Slide-over Compare Drawer for Sub-regions */}
        {selectedCompareCountryId && (
          <CompareSubRegionsDrawer
            key={selectedCompareCountryId}
            countryId={selectedCompareCountryId}
            onClose={() => setSelectedCompareCountryId(null)}
            myPlaces={myPlaces}
            friends={friends}
            countryData={countryData}
          />
        )}
      </div>
    </div>
  );
};

// ── Slide-over Sub-regions Comparison Drawer ───────────────────────

interface CompareSubRegionsDrawerProps {
  countryId: string;
  onClose: () => void;
  myPlaces: UserPlacesMap;
  friends: { id: string; name: string; places: UserPlacesMap }[];
  countryData: Record<string, { name: string; flag: string }>;
}

const CompareSubRegionsDrawer: React.FC<CompareSubRegionsDrawerProps> = ({
  countryId,
  onClose,
  myPlaces,
  friends,
  countryData
}) => {
  const [regions, setRegions] = useState<TopoRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'diffs' | 'mutual' | 'wishlist'>('all');

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
        if (activeFilter === 'wishlist') {
          return statuses.some(s => s === 'WISHLIST');
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
              <img src={countryInfo.flag} alt="" className="compare-drawer__flag" />
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
              Different
            </button>
            <button
              onClick={() => setActiveFilter('mutual')}
              className={`compare-drawer__filter-btn ${activeFilter === 'mutual' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Mutual
            </button>
            <button
              onClick={() => setActiveFilter('wishlist')}
              className={`compare-drawer__filter-btn ${activeFilter === 'wishlist' ? 'compare-drawer__filter-btn--active' : ''}`}
            >
              Wishlists
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

export default Compare;
