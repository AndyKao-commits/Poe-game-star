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
