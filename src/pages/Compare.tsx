import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';
import { deserializePlaces, serializePlaces } from '../utils/serialization';
import { CompareMap } from '../components/map/CompareMap';
import { Share2, Users, Plus, Trash2, Copy, Check, Ban } from 'lucide-react';

export interface MapCompareResult {
  type: 'EVERYONE_VISITED' | 'MOST_VISITED' | 'ONLY_ME_VISITED' | 'THEY_VISITED' | 'EVERYONE_WISHLIST' | 'MIXED_WISHLIST' | 'EVERYONE_AVOID' | 'NONE';
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

  // Merge logic for N-way compare
  const getMergedLists = () => {
    const allUsers = [{ name: 'Me', places: myPlaces }, ...friends];
    const totalUsers = allUsers.length;
    if (!allUsers || allUsers.length === 0) return { allVisited: [], allWishlisted: [], allAvoid: [], anyVisited: [], conflict: [], countryCounts: {} };
    
    const countryCounts: Record<string, { visited: number; wishlist: number; avoid: number }> = {};
    
    allUsers.forEach(user => {
      Object.entries(user.places || {}).forEach(([code, data]) => {
        if (code.includes('-')) return; // skip sub-regions
        if (!countryCounts[code]) countryCounts[code] = { visited: 0, wishlist: 0, avoid: 0 };
        if (data.status === 'VISITED') countryCounts[code].visited++;
        if (data.status === 'WISHLIST') countryCounts[code].wishlist++;
        if (data.status === 'AVOID') countryCounts[code].avoid++;
      });
    });

    const allVisited: string[] = [];
    const allWishlisted: string[] = [];
    const allAvoid: string[] = [];
    const anyVisited: string[] = [];
    const conflict: string[] = [];
    
    Object.entries(countryCounts).forEach(([code, counts]) => {
      if (counts.visited === totalUsers) allVisited.push(code);
      else if (counts.wishlist === totalUsers) allWishlisted.push(code);
      else if (counts.avoid === totalUsers) allAvoid.push(code);
      else if (counts.visited > 0 && counts.wishlist > 0) conflict.push(code);
      
      if (counts.visited > 0 && counts.visited < totalUsers) anyVisited.push(code);
    });
    
    return { allVisited, allWishlisted, allAvoid, anyVisited, conflict, countryCounts };
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
      let iVisited = myPlaces[code]?.status === 'VISITED';

      allUsers.forEach(u => {
        if (u.places[code]?.status === 'VISITED') visitedCount++;
        if (u.places[code]?.status === 'WISHLIST') wishlistCount++;
        if (u.places[code]?.status === 'AVOID') avoidCount++;
      });

      if (visitedCount === 0 && wishlistCount === 0 && avoidCount === 0) return;

      let type: MapCompareResult['type'] = 'NONE';
      let label = '';

      if (visitedCount === totalUsers) {
        type = 'EVERYONE_VISITED';
        label = 'Everyone Visited';
      } else if (visitedCount > 1) {
        type = 'MOST_VISITED';
        label = 'Most Visited';
      } else if (visitedCount === 1) {
        type = iVisited ? 'ONLY_ME_VISITED' : 'THEY_VISITED';
        label = iVisited ? 'Only I Visited' : 'Someone Visited';
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
        count: visitedCount > 0 ? visitedCount : (wishlistCount > 0 ? wishlistCount : avoidCount),
        totalUsers
      };
    });

    return result;
  }, [myPlaces, friends]);

  const [countryData, setCountryData] = useState<Record<string, {name: string, flag: string}>>({});
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags,independent')
      .then(res => res.json())
      .then((data: any[]) => {
        const map: Record<string, {name: string, flag: string}> = {};
        data.forEach(c => {
          if (c.independent === true) {
            map[c.cca2] = { name: c.name.common, flag: c.flags?.svg || '' };
          }
        });
        setCountryData(map);
      })
      .catch(err => console.error("Could not load country list", err));
  }, []);


  // Aggregate Analytics
  const commonVisited = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_VISITED');
  const commonWishlist = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_WISHLIST');
  const commonAvoid = Object.entries(mergedData).filter(([, r]) => r.type === 'EVERYONE_AVOID');

  // Complex Analytics
  const topWantedUnvisited = useMemo(() => {
    return Object.keys(mergedData)
      .map((code) => {
         let visited = 0;
         let wlist = 0;
         if (myPlaces[code]?.status === 'VISITED') visited++;
         if (myPlaces[code]?.status === 'WISHLIST') wlist++;
         friends.forEach(f => {
            if (f.places[code]?.status === 'VISITED') visited++;
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
         let whoVisited: string[] = [];
         let whoWants: string[] = [];

         if (myPlaces[code]?.status === 'VISITED') { visited++; whoVisited.push('Me'); }
         if (myPlaces[code]?.status === 'WISHLIST') { wlist++; whoWants.push('Me'); }

         friends.forEach(f => {
            if (f.places[code]?.status === 'VISITED') { visited++; whoVisited.push(f.name); }
            if (f.places[code]?.status === 'WISHLIST') { wlist++; whoWants.push(f.name); }
         });

         return { code, visited, wishlist: wlist, whoVisited, whoWants };
      })
      .filter(item => item.visited > 0 && item.wishlist > 0)
      .sort((a, b) => b.wishlist - a.wishlist)
      .slice(0, 5);
  }, [mergedData, myPlaces, friends]);

  const renderCountryItem = (code: string, data: { name: string, flag: string } | undefined) => (
    <li key={code} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {data?.flag ? (
         <img src={data?.flag} alt={`${data?.name} flag`} style={{ width: '1.5rem', height: '1.2rem', objectFit: 'cover', borderRadius: '2px' }} />
      ) : (
         <div style={{ width: '1.5rem', height: '1.2rem', background: '#333', borderRadius: '2px' }} />
      )}
      <span>{data?.name || code}</span>
    </li>
  );

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Top Header / Share Code */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Share2 size={24} color="var(--accent-primary)" />
            Compare with Friends
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Share your code and merge maps to find common destinations!</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Your Share Code :</div>
          <input 
            readOnly 
            value={myShareCode} 
            className="glass-input" 
            style={{ width: '150px', padding: '0.5rem', textOverflow: 'ellipsis' }}
          />
          <button className="glass-button glass-button--primary" onClick={handleCopyCode}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Friend Input List */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Group ({friends.length + 1})</h3>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
              Me (Base)
            </div>
            {friends.map(f => (
              <div key={f.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                {f.name}
                <button onClick={() => removeFriend(f.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>Map Legend</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-both)' }}></div> Everyone Visited</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-visited)' }}></div> Most Visited</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-me-only)' }}></div> Only I Visited</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-they-only)' }}></div> Someone Else Visited</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-wishlist-both)' }}></div> Everyone Wishlisted</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-wishlist)' }}></div> Wishlisted by Some</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-avoid)' }}></div> Everyone Avoids</div>
          </div>
        </div>
      </div>

      {/* Compare Map */}
      <div className="glass-panel" style={{ padding: '1.5rem', height: '500px', position: 'relative', overflow: 'hidden' }}>
        <CompareMap mergedData={mergedData} setTooltipContent={setTooltipContent} />
        {tooltipContent && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', zIndex: 100, backdropFilter: 'blur(4px)' }}>
            {tooltipContent}
          </div>
        )}
      </div>

      {/* Common Lists & Complex Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--color-both)', marginBottom: '1rem' }}>We've All Been To ({commonVisited.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {commonVisited.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonVisited.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common visited places.</li>}
          </ul>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--color-wishlist-both)', marginBottom: '1rem' }}>We All Want To Go To ({commonWishlist.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {commonWishlist.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonWishlist.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common wishlist places.</li>}
          </ul>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ban size={20} /> We All Avoid ({commonAvoid.length})
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {commonAvoid.map(([code]) => renderCountryItem(code, countryData[code]))}
            {commonAvoid.length === 0 && <li style={{ color: 'var(--text-muted)' }}>No common avoided places.</li>}
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Most Wanted (Unvisited)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Top destinations no one in the group has visited yet, but multiple people want to go to.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topWantedUnvisited.map(({code, wishlist}) => (
              <li key={code} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {countryData[code]?.flag ? (
                     <img src={countryData[code]?.flag} alt={`${countryData[code]?.name} flag`} style={{ width: '1.5rem', height: '1.2rem', objectFit: 'cover', borderRadius: '2px' }} />
                  ) : (
                     <div style={{ width: '1.5rem', height: '1.2rem', background: '#333', borderRadius: '2px' }} />
                  )}
                  <span>{countryData[code]?.name || code}</span>
                </div>
                <span style={{ color: 'var(--accent-wishlist)' }}>{wishlist} ❤️</span>
              </li>
            ))}
            {topWantedUnvisited.length === 0 && <li style={{ color: 'var(--text-muted)' }}>Not enough data.</li>}
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--color-me-only)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Travel Mentorship
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Destinations someone wants to visit, but someone else has already been to.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {wantedButVisited.map(({code, whoVisited, whoWants}) => (
              <li key={code} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {countryData[code]?.flag ? (
                     <img src={countryData[code]?.flag} alt={`${countryData[code]?.name} flag`} style={{ width: '1.5rem', height: '1.2rem', objectFit: 'cover', borderRadius: '2px' }} />
                  ) : (
                     <div style={{ width: '1.5rem', height: '1.2rem', background: '#333', borderRadius: '2px' }} />
                  )}
                  <span style={{ fontWeight: 600 }}>{countryData[code]?.name || code}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
