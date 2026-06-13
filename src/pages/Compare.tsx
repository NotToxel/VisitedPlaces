import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';
import { COUNTRIES, NUMERIC_TO_A3 } from '../data/countries';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { Share2, Users, Plus, Trash2, Copy, Check, Ban, RotateCcw } from 'lucide-react';

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
    <li key={code} className="compare-list-item">
      {data?.flag ? (
        <img src={data?.flag} alt={`${data?.name} flag`} className="country-flag" />
      ) : (
        <div className="country-flag-placeholder" />
      )}
      <span>{data?.name || code}</span>
    </li>
  );

  return (
    <div className="page-container page-transition">
      {/* Top Header / Share Code */}
      <div className="glass-panel compare-share-row">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Share2 size={24} color="var(--accent-primary)" />
            Compare with Friends
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Share your code and merge maps to find common destinations!</p>
        </div>
        
        <div className="share-code-box">
          <div className="share-code-label">Your Share Code:</div>
          <input 
            readOnly 
            value={myShareCode} 
            className="glass-input share-code-input"
          />
          <button className="glass-button glass-button--primary" onClick={handleCopyCode}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="compare-grid-three">
        
        {/* Friend Input List */}
        <div className="glass-panel compare-group-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Group ({friends.length + 1})</h3>
          
          <div className="friend-input-row">
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Paste friend's code here..."
              value={friendInput}
              onChange={e => setFriendInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
            />
            <button className="glass-button" onClick={handleAddFriend}>
              <Plus size={18} />
            </button>
          </div>

          <div className="friends-list">
            <div className="friend-card friend-card--me">
              Me (Base)
            </div>
            {friends.map(f => (
              <div key={f.id} className="friend-card">
                <span>{f.name}</span>
                <button onClick={() => removeFriend(f.id)} className="friend-remove-btn">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-panel legend-panel">
          <h3>Map Legend</h3>
          <div className="legend-grid">
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-both)' }}></div> Everyone Visited</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--accent-visited)' }}></div> Most Visited</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-me-only)' }}></div> Only I Visited</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-they-only)' }}></div> Someone Else Visited</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-revisit-both)' }}></div> Everyone Revisit</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-revisit-mixed)' }}></div> Revisit by Some</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-wishlist-both)' }}></div> Everyone Wishlisted</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--accent-wishlist)' }}></div> Wishlisted by Some</div>
            <div className="legend-item"><div className="legend-circle" style={{ background: 'var(--color-avoid)' }}></div> Everyone Avoids</div>
          </div>
        </div>
      </div>

      {/* Compare Map */}
      <div className="glass-panel compare-map-wrapper">
        <CompareMap mergedData={mergedData} setTooltipContent={setTooltipContent} numericToA3={NUMERIC_TO_A3} />
        {tooltipContent && (
          <div className="compare-tooltip">
            {tooltipContent}
          </div>
        )}
      </div>

      {/* Common Lists & Complex Analytics */}
      <div className="compare-lists-grid">
        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--color-both)' }}>We've All Been To ({commonVisited.length})</h3>
          <ul className="compare-list">
            {commonVisited.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonVisited.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common visited places.</li>}
          </ul>
        </div>

        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--color-revisit-both)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RotateCcw size={20} /> We All Want to Revisit ({commonRevisit.length})
          </h3>
          <ul className="compare-list">
            {commonRevisit.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonRevisit.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common revisit places.</li>}
          </ul>
        </div>
        
        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--color-wishlist-both)' }}>We All Want To Go To ({commonWishlist.length})</h3>
          <ul className="compare-list">
            {commonWishlist.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonWishlist.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common wishlist places.</li>}
          </ul>
        </div>
        
        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--color-avoid)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ban size={20} /> We All Avoid ({commonAvoid.length})
          </h3>
          <ul className="compare-list">
            {commonAvoid.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonAvoid.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common avoided places.</li>}
          </ul>
        </div>

        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Most Wanted (Unvisited)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Top destinations no one in the group has visited yet, but multiple people want to go to.</p>
          <ul className="compare-list">
            {topWantedUnvisited.map(({code, wishlist}) => (
              <li key={code} className="compare-list-item compare-list-item--flex">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {countryData[code]?.flag ? (
                    <img src={countryData[code]?.flag} alt={`${countryData[code]?.name} flag`} className="country-flag" />
                  ) : (
                    <div className="country-flag-placeholder" />
                  )}
                  <span>{countryData[code]?.name || code}</span>
                </div>
                <span style={{ color: 'var(--accent-wishlist)' }}>{wishlist} ❤️</span>
              </li>
            ))}
            {topWantedUnvisited.length === 0 && <li style={{ color: 'var(--text-muted)' }}>Not enough data.</li>}
          </ul>
        </div>

        <div className="glass-panel compare-list-panel">
          <h3 className="compare-list-title" style={{ color: 'var(--color-me-only)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Travel Mentorship
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Destinations someone wants to visit, but someone else has already been to.</p>
          <ul className="compare-list">
            {wantedButVisited.map(({code, whoVisited, whoWants}) => (
              <li key={code} className="mentorship-card">
                <div className="mentorship-card-header">
                  {countryData[code]?.flag ? (
                    <img src={countryData[code]?.flag} alt={`${countryData[code]?.name} flag`} className="country-flag" />
                  ) : (
                    <div className="country-flag-placeholder" />
                  )}
                  <span className="mentorship-card-title">{countryData[code]?.name || code}</span>
                </div>
                <div className="mentorship-card-body">
                  Visited by: <span style={{ color: 'var(--accent-visited)' }}>{whoVisited.join(', ')}</span><br/>
                  Wanted by: <span style={{ color: 'var(--accent-wishlist)' }}>{whoWants.join(', ')}</span>
                </div>
              </li>
            ))}
            {wantedButVisited.length === 0 && <li style={{ color: 'var(--text-muted)' }}>Not enough data.</li>}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default Compare;
