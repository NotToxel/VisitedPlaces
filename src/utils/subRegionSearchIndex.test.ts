import { describe, expect, it, vi } from 'vitest';
import { COUNTRIES } from '../data/countries';
import { loadSubRegionSearchIndex } from './subRegionSearchIndex';
import { fetchSubRegions } from './topojsonCache';

vi.mock('./topojsonCache', () => ({
  fetchSubRegions: vi.fn(async (id: string) => [{ id: `${id}-region`, name: 'Region' }]),
}));

describe('sub-region search index', () => {
  it('loads in bounded batches and reuses the completed index', async () => {
    const pending = loadSubRegionSearchIndex();
    expect(fetchSubRegions).toHaveBeenCalledTimes(8);

    const index = await pending;
    expect(Object.keys(index)).toHaveLength(COUNTRIES.length);
    expect(fetchSubRegions).toHaveBeenCalledTimes(COUNTRIES.length);
    expect(await loadSubRegionSearchIndex()).toBe(index);
    expect(fetchSubRegions).toHaveBeenCalledTimes(COUNTRIES.length);
  });
});
