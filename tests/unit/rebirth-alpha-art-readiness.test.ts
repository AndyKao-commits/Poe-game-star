import { describe, expect, it, vi } from 'vitest';
import { REQUIRED_ALPHA_ART, verifyAlphaArt } from '../../src/rebirth/art/alphaReadiness';

function fakeFetch(
  overrides: Record<string, { status?: number; type?: string; throws?: boolean }> = {},
): typeof fetch {
  return vi.fn(async (url: string | URL | Request) => {
    const path = String(url);
    const override = overrides[path] ?? {};
    if (override.throws) throw new Error('network offline');
    return {
      ok: (override.status ?? 200) < 400,
      headers: new Headers({
        'content-type': override.type ??
          (path.endsWith('.png') ? 'image/png' : 'application/json'),
      }),
    } as Response;
  }) as unknown as typeof fetch;
}

describe('Rebirth first Alpha art readiness', () => {
  it('requires protagonist, enemy and urban atlas exports plus metadata', () => {
    expect(REQUIRED_ALPHA_ART).toHaveLength(6);
    expect(REQUIRED_ALPHA_ART).toContain('/rebirth/art/fire-brawler-character.json');
    expect(REQUIRED_ALPHA_ART).toContain('/rebirth/art/urban-ground-atlas.png');
  });
  it('accepts all expected assets with correct MIME', async () => {
    expect(await verifyAlphaArt(fakeFetch())).toEqual({
      ready: true, missing: [], invalidType: [],
    });
  });
  it('rejects missing assets and Vite HTML fallback despite 200 status', async () => {
    const result = await verifyAlphaArt(fakeFetch({
      '/rebirth/art/fire-brawler-character.png': { status: 404 },
      '/rebirth/art/aze-character.json': { type: 'text/html' },
    }));
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(['/rebirth/art/fire-brawler-character.png']);
    expect(result.invalidType).toEqual(['/rebirth/art/aze-character.json']);
  });
  it('rejects network errors and never reports ready', async () => {
    const result = await verifyAlphaArt(fakeFetch({
      '/rebirth/art/fire-brawler-character.json': { throws: true },
    }));
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(['/rebirth/art/fire-brawler-character.json']);
  });
});
