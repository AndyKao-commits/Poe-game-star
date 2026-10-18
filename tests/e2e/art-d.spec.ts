import { test, expect } from '@playwright/test';

/**
 * Real browser texture contract: Phaser must decode and register each delivered
 * Art D image. Header-only PNG verification cannot detect runtime load errors.
 */
test('Art D textures load and monster animations are registered', async ({ page }) => {
  const assetFailures: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/art-d/') && !response.ok()) {
      assetFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });

  const assets = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__!;
    const textures = ['player', 'crawler', 'sentinel', 'tile-floor', 'tile-wall', 'tile-obstacle', 'tile-void', 'slash', 'art-d-telegraph', 'art-d-hit', 'art-d-ui-attack', 'art-d-ui-skill', 'art-d-ui-potion'];
    const animationStates = ['idle', 'chase', 'hurt', 'windup', 'attack'];
    return {
      missingTextures: textures.filter((key) => !game.textures.exists(key)),
      dimensions: textures.map((key) => {
        const source = game.textures.get(key).getSourceImage() as HTMLImageElement;
        return { key, width: source.width, height: source.height };
      }),
      missingAnimations: ['crawler', 'sentinel'].flatMap((role) =>
        animationStates.map((state) => `${role}-${state}`).filter((key) => !game.anims.exists(key)),
      ),
    };
  });
  expect(assetFailures).toEqual([]);
  expect(assets.missingTextures).toEqual([]);
  expect(assets.missingAnimations).toEqual([]);
  expect(assets.dimensions).toEqual([
    { key: 'player', width: 256, height: 192 },
    { key: 'crawler', width: 128, height: 160 },
    { key: 'sentinel', width: 128, height: 160 },
    { key: 'tile-floor', width: 64, height: 32 },
    { key: 'tile-wall', width: 64, height: 32 },
    { key: 'tile-obstacle', width: 64, height: 32 },
    { key: 'tile-void', width: 64, height: 32 },
    { key: 'slash', width: 48, height: 48 },
    { key: 'art-d-telegraph', width: 48, height: 48 },
    { key: 'art-d-hit', width: 48, height: 48 },
    { key: 'art-d-ui-attack', width: 32, height: 32 },
    { key: 'art-d-ui-skill', width: 32, height: 32 },
    { key: 'art-d-ui-potion', width: 32, height: 32 },
  ]);
});

test('replacement Sentinel atlas and hit effect have visible decoded pixels', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    return Boolean(game?.textures.exists('sentinel') && game.textures.exists('art-d-hit'));
  });

  const coverage = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__!;
    const inspect = (key: string, cellSize: number) => {
      const image = game.textures.get(key).getSourceImage() as HTMLImageElement;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const columns = canvas.width / cellSize;
      const rows = canvas.height / cellSize;
      const occupied: number[] = [];
      let opaque = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          let visible = 0;
          for (let y = row * cellSize; y < (row + 1) * cellSize; y++) {
            for (let x = col * cellSize; x < (col + 1) * cellSize; x++) {
              if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
                visible++;
                opaque++;
              }
            }
          }
          occupied.push(visible);
        }
      }
      return { opaque, occupied };
    };
    return { sentinel: inspect('sentinel', 32), hit: inspect('art-d-hit', 48) };
  });

  expect(coverage.sentinel.occupied).toHaveLength(20);
  expect(coverage.sentinel.occupied.every((pixels) => pixels > 0)).toBe(true);
  expect(coverage.sentinel.opaque).toBeGreaterThan(200);
  expect(coverage.hit.occupied).toHaveLength(1);
  expect(coverage.hit.opaque).toBeGreaterThan(100);
});

test('enemy telegraph render state is consistent with combat phase', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getEnemyVisualsForTests?: () => unknown[] }
      | undefined;
    return Boolean(scene?.getEnemyVisualsForTests?.().length);
  });
  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getEnemyVisualsForTests: () => Array<{
        alive: boolean;
        phase: string;
        telegraphVisible: boolean;
        telegraphPosition: { x: number; y: number } | null;
        spritePosition: { x: number; y: number };
      }>;
    };
    const enemies = scene.getEnemyVisualsForTests();
    return {
      count: enemies.length,
      invalid: enemies.filter((enemy) =>
        (!enemy.alive && enemy.telegraphVisible) ||
        (enemy.telegraphVisible && enemy.phase !== 'windup') ||
        (enemy.telegraphVisible && (
          !enemy.telegraphPosition ||
          Math.abs(enemy.telegraphPosition.x - enemy.spritePosition.x) > 1 ||
          Math.abs(enemy.telegraphPosition.y - enemy.spritePosition.y) > 1
        )),
      ),
    };
  });
  expect(result.count).toBeGreaterThan(0);
  expect(result.invalid).toEqual([]);
});

test('enemy telegraph state stays valid across a scene restart', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getEnemyVisualsForTests?: () => unknown[]; restartForTests?: () => void }
      | undefined;
    return Boolean(scene?.getEnemyVisualsForTests?.().length && scene?.restartForTests);
  });
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      restartForTests: () => void;
    };
    scene.restartForTests();
  });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getEnemyVisualsForTests?: () => Array<{ alive: boolean }> }
      | undefined;
    return Boolean(scene?.getEnemyVisualsForTests?.().some((enemy) => enemy.alive));
  });
  const visuals = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getEnemyVisualsForTests: () => Array<{
        alive: boolean;
        telegraphVisible: boolean;
        telegraphPosition: { x: number; y: number } | null;
      }>;
    };
    return scene.getEnemyVisualsForTests();
  });
  expect(visuals.length).toBeGreaterThan(0);
  expect(visuals.every((enemy) => enemy.alive)).toBe(true);
  expect(visuals.every((enemy) => !enemy.telegraphVisible)).toBe(true);
});
