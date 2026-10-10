import { sanitizePlaces } from '../store/useStore';
import type { UserPlacesMap, ResidencyPeriod, PlaceStatus, RegionData, CountryData } from '../store/useStore';

export const serializePlaces = (places: UserPlacesMap): string => {
  try {
    const compact: Record<string, unknown> = {};
    for (const [code, data] of Object.entries(places)) {
      const hasStatus = data.status && data.status !== 'NONE';
      const hasRegions = data.regions && Object.keys(data.regions).length > 0;
      const hasLived = Boolean(data.lived);
      const hasPeriods = data.periods && data.periods.length > 0;
      const hasLivedRegions = data.livedRegions && Object.keys(data.livedRegions).length > 0;
      const hasRegionPeriods = data.regionPeriods && Object.keys(data.regionPeriods).length > 0;

      if (!hasStatus && !hasRegions && !hasLived && !hasPeriods && !hasLivedRegions && !hasRegionPeriods) {
        continue;
      }

      const item: Record<string, unknown> = {
        status: data.status,
        regions: data.regions || {}
      };

      if (hasLived) item.lived = true;
      if (hasPeriods) {
        item.periods = data.periods!.map((p) => {
          const cp: Record<string, unknown> = { s: p.start };
          if (p.end) cp.e = p.end;
          if (p.current) cp.c = true;
          if (p.note) cp.n = p.note;
          return cp;
        });
      }
      if (hasLivedRegions) item.livedRegions = data.livedRegions;
      if (hasRegionPeriods) {
        const crp: Record<string, unknown> = {};
        for (const [rCode, rPeriods] of Object.entries(data.regionPeriods!)) {
          if (rPeriods && rPeriods.length > 0) {
            crp[rCode] = rPeriods.map((p) => {
              const cp: Record<string, unknown> = { s: p.start };
              if (p.end) cp.e = p.end;
              if (p.current) cp.c = true;
              if (p.note) cp.n = p.note;
              return cp;
            });
          }
        }
        if (Object.keys(crp).length > 0) item.regionPeriods = crp;
      }

      compact[code] = item;
    }

    const jsonStr = JSON.stringify(compact);
    
    // Convert to base64, handling UTF-8 
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    
    // Make it URL safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Failed to serialize places data", e);
    return "";
  }
};

function normalizeCompactPeriods(raw: unknown): ResidencyPeriod[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list: ResidencyPeriod[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const start = String(p.s || p.start || '').trim();
    if (!start) continue;
    const end = (p.e || p.end) ? String(p.e || p.end).trim() : undefined;
    const current = Boolean(p.c ?? p.current);
    const note = (p.n || p.note) ? String(p.n || p.note).trim() : undefined;
    const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    list.push({ id, start, end, current, note });
  }
  return list.length > 0 ? list : undefined;
}

export const deserializePlaces = (encodedStr: string): UserPlacesMap | null => {
  try {
    // Revert URL safe characters
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with '=' so length is a multiple of 4
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    
    // Unpack compact periods if present
    const normalized: UserPlacesMap = {};
    for (const [code, val] of Object.entries(parsed)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      const cData = val as Record<string, unknown>;
      
      const periods = normalizeCompactPeriods(cData.periods);
      let regionPeriods: Record<string, ResidencyPeriod[]> | undefined;
      if (cData.regionPeriods && typeof cData.regionPeriods === 'object') {
        const rpObj = cData.regionPeriods as Record<string, unknown>;
        const unp: Record<string, ResidencyPeriod[]> = {};
        for (const [rCode, rVal] of Object.entries(rpObj)) {
          const rList = normalizeCompactPeriods(rVal);
          if (rList) unp[rCode] = rList;
        }
        if (Object.keys(unp).length > 0) regionPeriods = unp;
      }

      normalized[code] = {
        ...cData,
        status: (typeof cData.status === 'string' ? cData.status : 'NONE') as PlaceStatus,
        regions: (typeof cData.regions === 'object' && cData.regions ? cData.regions : {}) as RegionData,
        ...(periods ? { periods } : {}),
        ...(regionPeriods ? { regionPeriods } : {})
      } as CountryData;
    }

    return sanitizePlaces(normalized);
  } catch (e) {
    console.error("Failed to deserialize places data", e);
    return null;
  }
};
