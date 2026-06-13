import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { serializePlaces, deserializePlaces } from './serialization';
import type { UserPlacesMap } from '../store/useStore';

describe('Serialization / Deserialization of places', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('should handle empty places object', () => {
    const emptyPlaces: UserPlacesMap = {};
    const serialized = serializePlaces(emptyPlaces);
    expect(serialized).toBeTypeOf('string');
    
    const deserialized = deserializePlaces(serialized);
    expect(deserialized).toEqual(emptyPlaces);
  });

  it('should serialize and deserialize a standard UserPlacesMap correctly', () => {
    const places: UserPlacesMap = {
      USA: {
        status: 'VISITED',
        regions: {
          'US-CA': 'VISITED',
          'US-NY': 'WISHLIST'
        }
      },
      GBR: {
        status: 'WISHLIST',
        regions: {}
      }
    };

    const serialized = serializePlaces(places);
    expect(serialized).toBeTypeOf('string');
    // Ensure no unsafe URL characters
    expect(serialized).not.toContain('+');
    expect(serialized).not.toContain('/');
    expect(serialized).not.toContain('=');

    const deserialized = deserializePlaces(serialized);
    expect(deserialized).toEqual(places);
  });

  it('should handle URL-safe character replacements and padding restoration', () => {
    // A complex payload that forces + and / in base64 encoding
    const complexPlaces: UserPlacesMap = {
      // Some keys and statuses that trigger varied base64 representations
      'TEST-1': {
        status: 'AVOID',
        regions: {
          'R1': 'AVOID',
          'R2': 'REVISIT',
          'R3': 'VISITED',
          'R4': 'WISHLIST'
        }
      },
      'TEST-2': {
        status: 'REVISIT',
        regions: {
          'R-A': 'NONE'
        }
      }
    };

    const serialized = serializePlaces(complexPlaces);
    const deserialized = deserializePlaces(serialized);
    expect(deserialized).toEqual(complexPlaces);
  });

  it('should return null when deserializing malformed base64 input', () => {
    const malformed = 'not-a-valid-base64-string!@#$';
    const result = deserializePlaces(malformed);
    expect(result).toBeNull();
  });

  it('should return null when deserializing valid base64 but invalid JSON', () => {
    // base64 encoding of "this is not JSON"
    const validBase64InvalidJson = btoa("this is not JSON").replace(/\+/g, '-').replace(/\//g, '_');
    const result = deserializePlaces(validBase64InvalidJson);
    expect(result).toBeNull();
  });
});
