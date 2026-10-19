import { test, expect } from '@playwright/test';

async function waitForRebirthGate(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    return Boolean(game?.scene.isActive('RebirthEntryScene'));
  });
}

test('boots the independent Rebirth release gate without a legacy scene', async ({ page }) => {
  await waitForRebirthGate(page);
  await expect(page).toHaveTitle(/Ashen Reliquary: Rebirth/);

  const status = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__!;
    const scene = game.scene.getScene('RebirthEntryScene');
    const text = scene.children.list
      .filter((object) => 'text' in object && typeof (object as { text?: unknown }).text === 'string')
      .map((object) => (object as { text: string }).text);
    return {
      active: game.scene.isActive('RebirthEntryScene'),
      legacyActive: game.scene.isActive('GameScene') || game.scene.isActive('BootScene'),
      sceneCount: game.scene.scenes.length,
      text,
    };
  });

  expect(status.active).toBe(true);
  expect(status.legacyActive).toBe(false);
  expect(status.sceneCount).toBe(1);
  expect(status.text.join(' ')).toContain('ASHEN RELIQUARY: REBIRTH');
  expect(status.text.join(' ')).toContain('目前未開放遊玩');
});

test('resizes the non-playable gate without loading temporary textures', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForRebirthGate(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await expect.poll(() => page.evaluate(() => {
    const game = window.__ASHEN_GAME__!;
    return game.scale.width < game.scale.height;
  })).toBe(true);

  const assets = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__!;
    return game.textures.getTextureKeys().filter((key) => key !== '__DEFAULT' && key !== '__MISSING' && key !== '__WHITE');
  });
  expect(assets).toEqual([]);
});
