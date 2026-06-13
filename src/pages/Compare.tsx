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
      <span className="truncate flex-1 font-semibold">{data?.name || code}</span>
    </li>
  );

  const hasImportedFriend = friends.length > 0;

  return (
    <div className="flex flex-col md:flex-row h-full w-full relative overflow-hidden bg-base-100 select-none">
      {/* Sidebar Controls */}
      <aside className={`glass-panel border-r border-base-300 flex flex-col transition-all duration-300 shrink-0 z-30 
        ${isSidebarCollapsed 
          ? 'w-0 h-0 overflow-hidden opacity-0 border-r-0' 
          : 'w-full md:w-80 h-[45vh] md:h-full opacity-100'
        }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-base-300/50 shrink-0">
          <span className="font-bold text-sm text-base-content tracking-wide">Comparison Panel</span>
          <button 
            className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content" 
            onClick={() => setIsSidebarCollapsed(true)}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Group Management Selector */}
          <div className="card card-compact bg-base-200/40 border border-base-300/40 p-3.5 rounded-xl flex flex-col gap-2 shrink-0 animate-fade-in">
            <span className="text-[10px] font-bold tracking-wider text-base-content/50 uppercase">
              Comparison Group
            </span>
            <div className="flex gap-1.5 w-full">
              <select
                value={activeGroupId}
                onChange={(e) => setActiveGroupId(e.target.value)}
                className="select select-bordered select-xs flex-1 text-xs font-semibold cursor-pointer bg-base-300/10"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.friends.length + 1} users)
                  </option>
                ))}
              </select>
              <button 
                onClick={handleDeleteGroup}
                className="btn btn-square btn-outline btn-error btn-xs border-error/30"
                title="Delete Group"
                disabled={groups.length <= 1}
              >
                <Trash2 size={13} />
              </button>
            </div>
            <button 
              onClick={handleCreateGroup} 
              className="btn btn-primary btn-xs w-full gap-1 mt-0.5"
            >
              <Plus size={12} /> Create New Group
            </button>
          </div>

          {/* Share Code Collapse */}
          <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
            <summary className="collapse-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
              Your Share Code
            </summary>
            <div className="collapse-content flex flex-col text-xs">
              <div className="join w-full mt-0.5">
                <input 
                  readOnly 
                  value={myShareCode} 
                  className="input input-bordered input-xs join-item flex-1 font-mono text-[9px] select-all bg-base-300/10"
                />
                <button 
                  className="btn btn-primary btn-xs join-item px-2.5" 
                  onClick={handleCopyCode}
                  title="Copy share code"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </details>

          {/* Group Members Collapse */}
          <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
            <summary className="collapse-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
              Group Members ({friends.length + 1})
            </summary>
            <div className="collapse-content flex flex-col gap-2.5 text-xs">
              <div className="join w-full mt-0.5">
                <input 
                  type="text" 
                  className="input input-bordered input-xs join-item flex-1 text-xs bg-base-300/10" 
                  placeholder="Friend's share code..."
                  value={friendInput}
                  onChange={e => setFriendInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                />
                <button className="btn btn-secondary btn-xs join-item px-2.5" onClick={handleAddFriend}>
                  <Plus size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36 border border-base-300 rounded-xl p-2 bg-base-300/10">
                <div className="p-1.5 px-2.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-semibold select-none">
                  Me (Base Profile)
                </div>
                {friends.map(f => (
                  <div key={f.id} className="p-1.5 px-2 rounded-lg border border-base-300/40 bg-base-200/40 text-base-content text-xs flex items-center justify-between gap-2 transition-all">
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => renameFriend(f.id, e.target.value)}
                      className="input input-bordered input-xs flex-1 text-xs font-semibold px-2 py-0.5 bg-base-300/30"
                      title="Click to rename"
                    />
                    <button 
                      onClick={() => removeFriend(f.id)} 
                      className="btn btn-ghost btn-xs btn-circle text-error/60 hover:text-error hover:bg-error/10"
                      title="Remove Friend"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Redesigned comparison layout flow: Hide Map Legend and Analytics lists until friend code is loaded */}
          {hasImportedFriend && (
            <>
              {/* Map Legend Collapse */}
              <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                <summary className="collapse-title text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none cursor-pointer py-3 min-h-0">
                  Map Legend
                </summary>
                <div className="collapse-content grid grid-cols-2 gap-2 text-[10px] p-1 select-none font-semibold text-base-content/85">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-both)' }}></div> Both Visited</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--accent-visited)' }}></div> Most Visited</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-me-only)' }}></div> Me Only</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-they-only)' }}></div> Others Only</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-revisit-both)' }}></div> Both Revisit</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-revisit-mixed)' }}></div> Some Revisit</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-wishlist-both)' }}></div> Both Wishlist</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--accent-wishlist)' }}></div> Some Wishlist</div>
                  <div className="flex items-center gap-1.5 col-span-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-avoid)' }}></div> Everyone Avoids</div>
                </div>
              </details>

              {/* Comparison Mutual Lists */}
              <div className="flex flex-col gap-3 border-t border-base-300/45 pt-4 mt-1 select-none">
                <span className="text-[10px] font-bold tracking-wider text-base-content/50 uppercase select-none mb-1">
                  Comparison Analytics
                </span>
                
                {/* Mutual Visited Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0" open>
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-color-both uppercase select-none cursor-pointer py-3 min-h-0">
                    We've All Visited ({commonVisited.length})
                  </summary>
                  <div className="collapse-content flex flex-col text-xs">
                    <ul className="compare-list border border-base-300 rounded-xl p-2 bg-base-300/10 max-h-36 overflow-y-auto">
                      {commonVisited.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonVisited.length === 0 && <li className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">No mutually visited places.</li>}
                    </ul>
                  </div>
                </details>

                {/* Mutual Wishlisted Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0">
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-color-wishlist-both uppercase select-none cursor-pointer py-3 min-h-0">
                    Mutual Wishlists ({commonWishlist.length})
                  </summary>
                  <div className="collapse-content flex flex-col text-xs">
                    <ul className="compare-list border border-base-300 rounded-xl p-2 bg-base-300/10 max-h-36 overflow-y-auto">
                      {commonWishlist.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonWishlist.length === 0 && <li className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">No mutually wishlisted places.</li>}
                    </ul>
                  </div>
                </details>

                {/* Mutual Revisit Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0">
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-accent-revisit uppercase select-none cursor-pointer py-3 min-h-0">
                    Mutual Revisit ({commonRevisit.length})
                  </summary>
                  <div className="collapse-content flex flex-col text-xs">
                    <ul className="compare-list border border-base-300 rounded-xl p-2 bg-base-300/10 max-h-36 overflow-y-auto">
                      {commonRevisit.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonRevisit.length === 0 && <li className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">No mutually revisited places.</li>}
                    </ul>
                  </div>
                </details>

                {/* Mutual Avoids Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0">
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-accent-avoid uppercase select-none cursor-pointer py-3 min-h-0">
                    Mutual Avoids ({commonAvoid.length})
                  </summary>
                  <div className="collapse-content flex flex-col text-xs">
                    <ul className="compare-list border border-base-300 rounded-xl p-2 bg-base-300/10 max-h-36 overflow-y-auto">
                      {commonAvoid.map(([code]) => renderCountryItem(code, countryData[code]))}
                      {commonAvoid.length === 0 && <li className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">No mutually avoided places.</li>}
                    </ul>
                  </div>
                </details>

                {/* Most Wanted Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0">
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-primary uppercase select-none cursor-pointer py-3 min-h-0">
                    Most Wanted ({topWantedUnvisited.length})
                  </summary>
                  <div className="collapse-content flex flex-col text-xs">
                    <ul className="compare-list border border-base-300 rounded-xl p-2 bg-base-300/10 max-h-36 overflow-y-auto">
                      {topWantedUnvisited.map(({code, wishlist}) => (
                        <li key={code} className="compare-list-item compare-list-item--flex flex items-center justify-between p-1.5 px-2.5 rounded-lg text-xs gap-2 border border-transparent hover:bg-base-200/50">
                          <div className="flex items-center gap-2 min-width-0">
                            {countryData[code]?.flag ? (
                              <img src={countryData[code]?.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm border border-base-300/20 shrink-0" />
                            ) : (
                              <div className="w-5 h-3.5 bg-base-300 rounded-sm border border-base-300/20 shrink-0" />
                            )}
                            <span className="truncate font-semibold">{countryData[code]?.name || code}</span>
                          </div>
                          <span className="text-accent-wishlist flex items-center gap-0.5 shrink-0 text-[10px] font-bold">{wishlist} ❤️</span>
                        </li>
                      ))}
                      {topWantedUnvisited.length === 0 && <li className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">Not enough data.</li>}
                    </ul>
                  </div>
                </details>

                {/* Travel Mentorships Collapse */}
                <details className="collapse collapse-arrow bg-base-200/40 border border-base-300/40 rounded-xl shrink-0">
                  <summary className="collapse-title text-[10px] font-bold tracking-wider text-color-me-only uppercase select-none cursor-pointer py-3 min-h-0">
                    Travel Mentorships ({wantedButVisited.length})
                  </summary>
                  <div className="collapse-content flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                    {wantedButVisited.map(({code, whoVisited, whoWants}) => (
                      <div key={code} className="mentorship-card">
                        <div className="mentorship-card-header">
                          {countryData[code]?.flag ? (
                            <img src={countryData[code]?.flag} alt="" className="w-5 h-3.5 object-cover rounded-sm border border-base-300/20 shrink-0" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className="w-5 h-3.5 bg-base-300 rounded-sm border border-base-300/20 shrink-0" />
                          )}
                          <span className="mentorship-card-title">{countryData[code]?.name || code}</span>
                        </div>
                        <div className="mentorship-card-body text-[10px] opacity-80 leading-relaxed text-base-content/70">
                          Visited: <span className="text-accent-visited font-semibold">{whoVisited.join(', ')}</span><br/>
                          Wants: <span className="text-accent-wishlist font-semibold">{whoWants.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                    {wantedButVisited.length === 0 && <span className="text-[10px] text-base-content/50 px-2 py-1 italic font-medium">No mentorship combinations found.</span>}
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Map Viewport Area */}
      <main className="flex-1 h-full w-full relative overflow-hidden flex flex-col">
        {/* Toggle Sidebar Trigger if Collapsed */}
        {isSidebarCollapsed && (
          <button 
            className="absolute top-4 left-4 btn btn-neutral btn-sm shadow-lg gap-1.5 z-40"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Controls"
          >
            <Menu size={14} /> 
            <span className="hidden sm:inline text-xs font-semibold">Compare Panel</span>
          </button>
        )}

        <div className="flex-1 w-full h-full relative overflow-hidden">
          {hasImportedFriend ? (
            <>
              <CompareMap mergedData={mergedData} setTooltipContent={setTooltipContent} numericToA3={NUMERIC_TO_A3} />
              {tooltipContent && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-base-300/95 backdrop-blur-md border border-base-300 rounded-lg shadow-xl text-xs font-bold text-base-content select-none pointer-events-none z-40 transition-opacity">
                  {tooltipContent}
                </div>
              )}
            </>
          ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg card bg-base-200/50 border border-base-300 shadow-2xl p-6 text-center select-none backdrop-blur-md flex flex-col gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-base-content">Compare Travel Maps</h3>
              <p className="text-xs text-base-content/60 leading-relaxed max-w-sm mx-auto">
                Visualize intersecting travel paths, mutual dream destinations, and travel compatibility stats by grouping with friends.
              </p>
              
              <div className="bg-base-300/35 border border-base-300/50 rounded-xl p-4 text-left flex flex-col gap-2 text-xs text-base-content/80 mt-2 animate-fade-in">
                <h4 className="font-bold text-base-content">How to get started:</h4>
                <ol className="list-decimal list-inside flex flex-col gap-1.5 pl-1 leading-relaxed text-base-content/70">
                  <li>Copy your own share code below and send it to your friend.</li>
                  <li>Collect your friend's travel share code.</li>
                  <li>Paste their code into the **Group Members** input box on the left, then click <strong>Add (+)</strong> to begin comparing.</li>
                </ol>
                
                <div className="flex justify-center mt-3">
                  <button onClick={handleCopyCode} className="btn btn-primary btn-sm gap-1.5 px-4 font-semibold shadow-md">
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
