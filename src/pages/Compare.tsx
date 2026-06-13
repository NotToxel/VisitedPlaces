import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';
import { COUNTRIES, NUMERIC_TO_A3 } from '../data/countries';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { MICROSTATES, UK_TERRITORIES, USA_TERRITORIES } from '../data/mapData';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Users
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [tooltipContent, setTooltipContent] = useState('');

  // Accordion toggle states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    share: true,
    group: true,
    legend: true,
    visited: true,
    wishlist: false,
    revisit: false,
    avoid: false,
    mostWanted: false,
    mentorship: false
  });

  // Load groups from localStorage, or initialize with a default group
  const [groups, setGroups] = useState<CompareGroup[]>(() => {
    try {
      const saved = localStorage.getItem('visited-places-compare-groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load compare groups", e);
    }
    return [{
      id: 'default',
      name: 'Default Group',
      friends: []
    }];
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('visited-places-active-group-id');
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return 'default';
  });

  // Save to localStorage when groups/activeGroup change
  useEffect(() => {
    localStorage.setItem('visited-places-compare-groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('visited-places-active-group-id', activeGroupId);
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  const friends = activeGroup.friends;

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const myShareCode = useMemo(() => serializePlaces(myPlaces), [myPlaces]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myShareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (!friendInput.trim()) return;
    const deserialized = deserializePlaces(friendInput.trim());
    if (deserialized) {
      setGroups(prev => prev.map(g => {
        if (g.id === activeGroup.id) {
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
      }));
      setFriendInput('');
    } else {
      alert("Invalid share code. Please check and try again.");
    }
  };

  const removeFriend = (friendId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          friends: g.friends.filter(f => f.id !== friendId)
        };
      }
      return g;
    }));
  };

  const renameFriend = (friendId: string, newName: string) => {
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

  const handleCreateGroup = () => {
    const name = prompt("Enter new group name:");
    if (!name || !name.trim()) return;
    const newId = Math.random().toString(36).substring(7);
    const newGroup: CompareGroup = {
      id: newId,
      name: name.trim(),
      friends: []
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newId);
  };

  const handleDeleteGroup = () => {
    if (groups.length <= 1) return;
    if (confirm(`Are you sure you want to delete group "${activeGroup.name}"?`)) {
      const remaining = groups.filter(g => g.id !== activeGroup.id);
      setGroups(remaining);
      setActiveGroupId(remaining[0].id);
    }
  };

  const mergedData = useMemo(() => {
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const totalUsers = allUsers.length;
    const result: Record<string, MapCompareResult> = {};

    // Gather all uniquely mentioned countries, microstates, and territories
    const allCountryCodes = new Set<string>();
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      const isMicrostateOrTerritory = 
        MICROSTATES.some(m => m.id === code) || 
        UK_TERRITORIES.some(t => t.id === code) || 
        USA_TERRITORIES.some(t => t.id === code);
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

  // Redefined countryData lookup map to also support territories and microstates!
  const countryData = useMemo(() => {
    const map: Record<string, {name: string, flag: string}> = {};
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
    // Add UK territories
    UK_TERRITORIES.forEach(t => {
      if (!map[t.id]) {
        map[t.id] = {
          name: t.name,
          flag: t.flagCode ? `https://flagcdn.com/${t.flagCode}.svg` : ''
        };
      }
    });
    // Add US territories
    USA_TERRITORIES.forEach(t => {
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

  const renderCountryItem = (code: string, data: { name: string, flag: string } | undefined) => (
    <li key={code} className="compare-list-item">
      {data?.flag ? (
        <img src={data.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', flexShrink: 0 }} />
      )}
      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{data?.name || code}</span>
    </li>
  );

  const hasImportedFriend = friends.length > 0;

  return (
    <div className="dashboard-layout">
      {/* Sidebar Controls */}
      <aside className={`dashboard-sidebar glass-panel ${isSidebarCollapsed ? 'dashboard-sidebar--collapsed' : ''}`}>
        {/* Header */}
        <div className="dashboard-sidebar-header">
          <span className="dashboard-sidebar-title">Comparison Panel</span>
          <button 
            className="glass-button" 
            style={{ border: 'none', background: 'transparent', padding: '0.25rem' }} 
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="dashboard-sidebar-scroll">
          {/* Group Management Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Comparison Group
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <select
                value={activeGroupId}
                onChange={(e) => setActiveGroupId(e.target.value)}
                className="glass-input"
                style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.25)', cursor: 'pointer' }}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id} style={{ background: 'var(--bg-dark)' }}>
                    {g.name} ({g.friends.length + 1} users)
                  </option>
                ))}
              </select>
              <button 
                onClick={handleDeleteGroup}
                className="glass-button"
                title="Delete Group"
                disabled={groups.length <= 1}
                style={{ padding: '0.4rem', opacity: groups.length <= 1 ? 0.35 : 1, cursor: groups.length <= 1 ? 'not-allowed' : 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <button 
              onClick={handleCreateGroup} 
              className="glass-button glass-button--primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', width: '100%' }}
            >
              <Plus size={14} /> Create New Group
            </button>
          </div>

          {/* Share Code Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem' }}>
            <h4 
              onClick={() => toggleAccordion('share')}
              style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
            >
              {openAccordions.share ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Your Share Code
            </h4>
            {openAccordions.share && (
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
                <input 
                  readOnly 
                  value={myShareCode} 
                  className="glass-input share-code-input"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: 'none' }}
                />
                <button 
                  className="glass-button glass-button--primary" 
                  onClick={handleCopyCode}
                  style={{ padding: '0.35rem 0.5rem' }}
                  title="Copy share code"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Group Members Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 
              onClick={() => toggleAccordion('group')}
              style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
            >
              {openAccordions.group ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Group Members ({friends.length + 1})
            </h4>
            {openAccordions.group && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="friend-input-row">
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Friend's share code..."
                    value={friendInput}
                    onChange={e => setFriendInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                  />
                  <button className="glass-button" onClick={handleAddFriend} style={{ padding: '0.4rem' }}>
                    <Plus size={16} />
                  </button>
                </div>

                <div className="friends-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <div className="friend-card friend-card--me" style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                    Me (Base Profile)
                  </div>
                  {friends.map(f => (
                    <div key={f.id} className="friend-card" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => renameFriend(f.id, e.target.value)}
                        className="glass-input"
                        style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.1)', border: '1px solid transparent', flex: 1, borderRadius: '4px' }}
                        title="Click to rename"
                      />
                      <button onClick={() => removeFriend(f.id)} className="friend-remove-btn" style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Redesigned comparison layout flow: Hide Map Legend and Analytics lists until friend code is loaded */}
          {hasImportedFriend && (
            <>
              {/* Map Legend Accordion */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 
                  onClick={() => toggleAccordion('legend')}
                  style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
                >
                  {openAccordions.legend ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Map Legend
                </h4>
                {openAccordions.legend && (
                  <div className="legend-grid" style={{ background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-both)' }}></div> Both Visited</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--accent-visited)' }}></div> Most Visited</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-me-only)' }}></div> Me Only</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-they-only)' }}></div> Others Only</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-revisit-both)' }}></div> Both Revisit</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-revisit-mixed)' }}></div> Some Revisit</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-wishlist-both)' }}></div> Both Wishlist</div>
                    <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--accent-wishlist)' }}></div> Some Wishlist</div>
                    <div className="legend-item" style={{ gridColumn: 'span 2' }}><div className="legend-circle" style={{ background: 'var(--color-avoid)' }}></div> Everyone Avoids</div>
                  </div>
                )}
              </div>

              {/* Comparison Mutual Lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comparison Analytics
                </span>
                
                {/* Mutual Visited Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('visited')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-both)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.visited ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    We've All Visited ({commonVisited.length})
                  </h4>
                  {openAccordions.visited && (
                    <ul className="compare-list" style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {commonVisited.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonVisited.length === 0 && <li style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>No mutually visited places.</li>}
                    </ul>
                  )}
                </div>

                {/* Mutual Wishlisted Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('wishlist')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-wishlist-both)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.wishlist ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Mutual Wishlists ({commonWishlist.length})
                  </h4>
                  {openAccordions.wishlist && (
                    <ul className="compare-list" style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {commonWishlist.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonWishlist.length === 0 && <li style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>No mutually wishlisted places.</li>}
                    </ul>
                  )}
                </div>

                {/* Mutual Revisit Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('revisit')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-revisit)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.revisit ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Mutual Revisit ({commonRevisit.length})
                  </h4>
                  {openAccordions.revisit && (
                    <ul className="compare-list" style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {commonRevisit.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonRevisit.length === 0 && <li style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>No mutually revisited places.</li>}
                    </ul>
                  )}
                </div>

                {/* Mutual Avoids Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('avoid')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-avoid)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.avoid ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Mutual Avoids ({commonAvoid.length})
                  </h4>
                  {openAccordions.avoid && (
                    <ul className="compare-list" style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {commonAvoid.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonAvoid.length === 0 && <li style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>No mutually avoided places.</li>}
                    </ul>
                  )}
                </div>

                {/* Most Wanted Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('mostWanted')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.mostWanted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Most Wanted ({topWantedUnvisited.length})
                  </h4>
                  {openAccordions.mostWanted && (
                    <ul className="compare-list" style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {topWantedUnvisited.map(({code, wishlist}) => (
                        <li key={code} className="compare-list-item compare-list-item--flex">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            {countryData[code]?.flag ? (
                              <img src={countryData[code]?.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', flexShrink: 0 }} />
                            )}
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{countryData[code]?.name || code}</span>
                          </div>
                          <span style={{ color: 'var(--accent-wishlist)', flexShrink: 0 }}>{wishlist} ❤️</span>
                        </li>
                      ))}
                      {topWantedUnvisited.length === 0 && <li style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>Not enough data.</li>}
                    </ul>
                  )}
                </div>

                {/* Travel Mentorships Accordion */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 
                    onClick={() => toggleAccordion('mentorship')}
                    style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-me-only)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {openAccordions.mentorship ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Travel Mentorships ({wantedButVisited.length})
                  </h4>
                  {openAccordions.mentorship && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {wantedButVisited.map(({code, whoVisited, whoWants}) => (
                        <div key={code} className="mentorship-card">
                          <div className="mentorship-card-header">
                            {countryData[code]?.flag ? (
                              <img src={countryData[code]?.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px', flexShrink: 0 }} />
                            )}
                            <span className="mentorship-card-title">{countryData[code]?.name || code}</span>
                          </div>
                          <div className="mentorship-card-body">
                            Visited: <span style={{ color: 'var(--accent-visited)' }}>{whoVisited.join(', ')}</span><br/>
                            Wants: <span style={{ color: 'var(--accent-wishlist)' }}>{whoWants.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                      {wantedButVisited.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>No mentorship combinations found.</span>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Map Viewport Area */}
      <main className="dashboard-viewport">
        {/* Toggle Sidebar Trigger if Collapsed */}
        {isSidebarCollapsed && (
          <button 
            className="glass-button sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Controls"
          >
            <Menu size={16} /> <span className="hide-mobile-text">Compare Panel</span>
          </button>
        )}

        <div className="compare-map-wrapper">
          {hasImportedFriend ? (
            <>
              <CompareMap mergedData={mergedData} setTooltipContent={setTooltipContent} numericToA3={NUMERIC_TO_A3} />
              {tooltipContent && (
                <div className="compare-tooltip">
                  {tooltipContent}
                </div>
              )}
            </>
          ) : (
            <div className="compare-empty-state glass-panel">
              <div className="compare-empty-state__icon-wrapper">
                <Users className="compare-empty-state__icon" size={40} />
              </div>
              <h3 className="compare-empty-state__title">Compare Travel Maps</h3>
              <p className="compare-empty-state__description">
                Visualize intersecting travel paths, mutual dream destinations, and travel compatibility stats by grouping with friends.
              </p>
              
              <div className="compare-empty-state__action-box">
                <h4>How to get started:</h4>
                <ol>
                  <li>Copy your own share code below (or inside the sidebar) and send it to your friend.</li>
                  <li>Collect your friend's travel share code.</li>
                  <li>Paste their code into the **Group Members** input box on the left, then click <strong>Add (+)</strong> to begin comparing.</li>
                </ol>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'center' }}>
                  <button onClick={handleCopyCode} className="glass-button glass-button--primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied Share Code!' : 'Copy My Share Code'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Compare;
