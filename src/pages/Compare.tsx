import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';
import { COUNTRIES, NUMERIC_TO_A3 } from '../data/countries';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown 
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

const Compare: React.FC = () => {
  const { places: myPlaces } = useStore();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [friendInput, setFriendInput] = useState('');
  const [tooltipContent, setTooltipContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Accordion toggle states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    share: true,
    group: true,
    legend: false,
    visited: true,
    wishlist: false,
    revisit: false,
    avoid: false,
    mostWanted: false,
    mentorship: false
  });
  
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
      setFriends([...friends, {
        id: Math.random().toString(36).substring(7),
        name: `Friend ${friends.length + 1}`,
        places: deserialized
      }]);
      setFriendInput('');
    } else {
      alert("Invalid share code. Please check and try again.");
    }
  };

  const removeFriend = (id: string) => {
    setFriends(friends.filter(f => f.id !== id));
  };

  const mergedData = useMemo(() => {
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const totalUsers = allUsers.length;
    const result: Record<string, MapCompareResult> = {};

    // Gather all uniquely mentioned countries
    const allCountryCodes = new Set<string>();
    allUsers.forEach(u => Object.keys(u.places).forEach(code => {
      if (!code.includes('-')) allCountryCodes.add(code);
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

  const countryData = useMemo(() => {
    const map: Record<string, {name: string, flag: string}> = {};
    COUNTRIES.forEach(c => {
      map[c.id] = { name: c.name, flag: c.flag };
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
      .filter(item => item.visited === 0 && item.wishlist > 1) // strictly unvisited by all, but wanted by >1
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
    <li key={code} className="compare-list-item" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}>
      {data?.flag ? (
        <img src={data?.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
      ) : (
        <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
      )}
      <span>{data?.name || code}</span>
    </li>
  );

  return (
    <div className="dashboard-layout">
      {/* Sidebar Controls */}
      <aside className={`dashboard-sidebar glass-panel ${isSidebarCollapsed ? 'dashboard-sidebar--collapsed' : ''}`}>
        {/* Header */}
        <div className="dashboard-sidebar-header">
          <span className="dashboard-sidebar-title">Comparison Config</span>
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
          {/* Share Code Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
              Group ({friends.length + 1})
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

                <div className="friends-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  <div className="friend-card friend-card--me" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                    Me (Base Profile)
                  </div>
                  {friends.map(f => (
                    <div key={f.id} className="friend-card" style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                      <span>{f.name}</span>
                      <button onClick={() => removeFriend(f.id)} className="friend-remove-btn" style={{ padding: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                    <li key={code} className="compare-list-item compare-list-item--flex" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {countryData[code]?.flag ? (
                          <img src={countryData[code]?.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
                        ) : (
                          <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
                        )}
                        <span>{countryData[code]?.name || code}</span>
                      </div>
                      <span style={{ color: 'var(--accent-wishlist)' }}>{wishlist} ❤️</span>
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
                    <div key={code} className="mentorship-card" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                      <div className="mentorship-card-header" style={{ gap: '0.35rem' }}>
                        {countryData[code]?.flag ? (
                          <img src={countryData[code]?.flag} alt="" className="country-flag" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
                        ) : (
                          <div className="country-flag-placeholder" style={{ width: '1.25rem', height: '0.95rem', borderRadius: '2px' }} />
                        )}
                        <span className="mentorship-card-title" style={{ fontSize: '0.75rem' }}>{countryData[code]?.name || code}</span>
                      </div>
                      <div className="mentorship-card-body" style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: 1.3 }}>
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
          <CompareMap mergedData={mergedData} setTooltipContent={setTooltipContent} numericToA3={NUMERIC_TO_A3} />
          {tooltipContent && (
            <div className="compare-tooltip">
              {tooltipContent}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Compare;
