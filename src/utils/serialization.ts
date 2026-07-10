import { migrateLegacyPlaces } from '../store/useStore';
import type { UserPlacesMap } from '../store/useStore';

export const serializePlaces = (places: UserPlacesMap): string => {
  try {
    // We only need to store status, and region statuses. 
    // Example: { "USA": { status: "VISITED", regions: {} } }
    // To minimize the string length for URL sharing, we can just stringify and encode.
    const jsonStr = JSON.stringify(places);
    
    // Convert to base64, handling UTF-8 
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    
    // Make it URL safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Failed to serialize places data", e);
    return "";
  }
};

export const deserializePlaces = (encodedStr: string): UserPlacesMap | null => {
  try {
    // Revert URL safe characters
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with '=' so length is a multiple of 4
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr) as UserPlacesMap;
    return migrateLegacyPlaces(parsed);
  } catch (e) {
    console.error("Failed to deserialize places data", e);
    return null;
  }
};
