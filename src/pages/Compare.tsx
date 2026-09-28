import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { COUNTRIES, NUMERIC_TO_A3 } from '../data/countries';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { CompareSubRegionsDrawer } from '../components/compare/CompareSubRegionsDrawer';
import { computeMergedData, computeCompatibilityScore, computeTopWantedUnvisited, computeWantedButVisited } from '../utils/compareAnalysis';
import type { MapCompareResult } from '../utils/compareAnalysis';
import { loadCompareGroups, loadActiveGroupId, saveCompareGroups, saveActiveGroupId } from '../utils/compareStorage';
import type { CompareGroup } from '../utils/compareStorage';
import { MICROSTATES } from '../data/mapData';
import { getAllTerritories } from '../data/territoriesRegistry';
import { hasDrilldownSupport } from '../utils/topojsonCache';
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

  const [groups, setGroups] = useState<CompareGroup[]>(loadCompareGroups);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => loadActiveGroupId(groups));

  useEffect(() => {
    saveCompareGroups(groups);
  }, [groups]);

  useEffect(() => {
    saveActiveGroupId(activeGroupId);
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find(g => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

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

  const mergedData = useMemo(() => computeMergedData(myPlaces, friends), [myPlaces, friends]);

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
  const compatibilityScore = useMemo(() => computeCompatibilityScore(myPlaces, friends), [myPlaces, friends]);

  // Complex Analytics
  const topWantedUnvisited = useMemo(() => computeTopWantedUnvisited(mergedData, myPlaces, friends), [mergedData, myPlaces, friends]);

  const wantedButVisited = useMemo(() => computeWantedButVisited(mergedData, myPlaces, friends), [mergedData, myPlaces, friends]);

  const hasImportedFriend = friends.length > 0;

  // ── Country pill renderer ──────────────────────────────────────────
  const renderCountryPill = (code: string) => {
    const data = countryData[code];
    const canDrilldown = hasDrilldownSupport(code);
    
    return (
      <button
        type="button"
        key={code} 
        className={`compare-country-pill ${canDrilldown ? 'compare-country-pill--clickable' : ''}`}
        onClick={canDrilldown ? () => setSelectedCompareCountryId(code) : undefined}
        disabled={!canDrilldown}
        title={canDrilldown ? "Compare sub-regions" : undefined}
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
      </button>
    );
  };

  // ── Country pills section renderer ────────────────────────────────
  const renderPillsSection = (
    title: string,
    tone: string,
    items: [string, MapCompareResult][],
    emptyText: string
  ) => (
    <div className={`compare-pills-section compare-pills-section--${tone}`}>
      <div className="compare-pills-section__header">
        <div className="compare-pills-section__dot" />
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
      <div className="compare-page survey-compare" style={{ overflowY: 'auto' }}>
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
    <div className="compare-page compare-page--scrollable survey-compare">
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
            <h1 className="compare-header-card__title">Compare maps</h1>

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
                  role="button"
                  tabIndex={isEditing ? -1 : 0}
                  aria-pressed={isActive}
                  onKeyDown={e => {
                    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setActiveGroupId(g.id);
                    }
                  }}
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

            <div className="compare-topbar__divider" />

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
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
          'both',
          commonVisited,
          'No mutually visited countries yet.'
        )}

        {renderPillsSection(
          'Mutual Wishlist',
          'wishlist',
          commonWishlist,
          'No shared wishlists yet.'
        )}

        {renderPillsSection(
          'Only I Visited',
          'me-only',
          onlyMeVisited,
          'None — your friends have been everywhere you have!'
        )}

        {renderPillsSection(
          'They Visited (Not Me)',
          'they-only',
          theyVisited,
          'You\'ve been everywhere they have!'
        )}

        {commonRevisit.length > 0 && renderPillsSection(
          'Mutual Revisit',
          'revisit',
          commonRevisit,
          ''
        )}

        {commonAvoid.length > 0 && renderPillsSection(
          'Everyone Avoids',
          'avoid',
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

export default Compare;
