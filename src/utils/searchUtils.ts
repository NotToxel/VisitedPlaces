/**
 * Search utilities for accent-insensitive, fuzzy, and nickname-aware search.
 */

const NICKNAMES: Record<string, string[]> = {
  'gb': ['uk', 'united kingdom', 'britain', 'great britain'],
  'gbr': ['uk', 'united kingdom', 'britain', 'great britain'],
  'us': ['usa', 'united states', 'america', 'united states of america'],
  'usa': ['us', 'united states', 'america', 'united states of america'],
  'ae': ['uae', 'united arab emirates'],
  'are': ['uae', 'united arab emirates'],
  'nl': ['holland'],
  'nld': ['holland'],
  'va': ['holy see'],
  'vat': ['holy see'],
  'cd': ['drc'],
  'cod': ['drc'],
};

/** Normalize string by stripping accents/diacritics and converting to lowercase. */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Standard Levenshtein distance implementation. */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Accent-insensitive fuzzy string match with Levenshtein distance check. */
export function fuzzyMatch(target: string, query: string): boolean {
  const cleanTarget = normalizeString(target);
  const cleanQuery = normalizeString(query).trim();

  if (!cleanQuery) return true;

  // 1. Direct or substring match
  if (cleanTarget.includes(cleanQuery)) return true;

  // Split target and query into words to match sub-components
  const targetWords = cleanTarget.split(/[\s,.-]+/);

  // If query is short (e.g. <= 3 chars), require exact substring/prefix match on a word to prevent false positive chaos
  if (cleanQuery.length <= 3) {
    return targetWords.some(w => w.startsWith(cleanQuery));
  }

  // Determine allowed edit distance based on query length
  const maxEdits = cleanQuery.length >= 8 ? 2 : 1;

  for (const word of targetWords) {
    if (word.length < 3) continue;

    // Check if query is prefix of word or vice versa
    if (word.startsWith(cleanQuery) || cleanQuery.startsWith(word)) return true;

    // Check Levenshtein distance
    const dist = levenshtein(cleanQuery, word);
    if (dist <= maxEdits) return true;

    // Check fuzzy prefix match (e.g. "kingdm" matches "kingdom")
    if (word.length > cleanQuery.length) {
      const prefix = word.substring(0, cleanQuery.length);
      if (levenshtein(cleanQuery, prefix) <= maxEdits) return true;
    }
  }

  return false;
}

/** Matches a country using its name, IDs, and shorthand nicknames. */
export function matchCountry(name: string, id: string, cca2: string, query: string): boolean {
  const cleanQuery = normalizeString(query).trim();
  if (!cleanQuery) return true;

  const a3 = id.toLowerCase();
  const a2 = cca2.toLowerCase();

  // Check custom nicknames
  const nicknames = [
    ...(NICKNAMES[a3] || []),
    ...(NICKNAMES[a2] || []),
    a3,
    a2
  ];

  if (nicknames.some(nick => nick === cleanQuery || nick.includes(cleanQuery))) {
    return true;
  }

  // Fall back to fuzzy name matching
  return fuzzyMatch(name, query);
}
