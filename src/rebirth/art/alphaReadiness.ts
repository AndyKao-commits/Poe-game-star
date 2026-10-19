/**
 * First alley Alpha art gate. Checks binary availability, not artistic approval.
 * Full release additionally requires source provenance, review and device QA.
 */
export const REQUIRED_ALPHA_ART = [
  '/rebirth/art/aze-character.png',
  '/rebirth/art/aze-character.json',
  '/rebirth/art/fire-brawler-character.png',
  '/rebirth/art/fire-brawler-character.json',
] as const;

export interface ArtReadiness {
  ready: boolean;
  missing: string[];
  invalidType: string[];
}

/**
 * Vite SPA fallback may respond 200 HTML for missing PNG/JSON; check MIME.
 * This is a preflight only, not a substitute for texture decoding and review.
 */
export async function verifyAlphaArt(
  fetcher: typeof fetch = fetch,
): Promise<ArtReadiness> {
  const missing: string[] = [];
  const invalidType: string[] = [];
  await Promise.all(REQUIRED_ALPHA_ART.map(async url => {
    try {
      const response = await fetcher(url, { method: 'GET', cache: 'no-store' });
      if (!response.ok) {
        missing.push(url);
        return;
      }
      const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
      const valid = url.endsWith('.png')
        ? contentType.includes('image/png')
        : contentType.includes('application/json');
      if (!valid) invalidType.push(url);
    } catch {
      missing.push(url);
    }
  }));
  return {
    ready: missing.length === 0 && invalidType.length === 0,
    missing: missing.sort(),
    invalidType: invalidType.sort(),
  };
}
