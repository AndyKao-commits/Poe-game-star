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
    return game.textures.getTextureKeys().filter((key) => !key.startsWith('__'));
  });
  expect(assets).toEqual([]);
});

test('shows orientation guidance only in portrait and keeps text inside narrow viewports', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForRebirthGate(page);

  const readGate = () => page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('RebirthEntryScene');
    const texts = scene.children.list.filter((object) => 'text' in object) as
      import('phaser').GameObjects.Text[];
    const hint = texts.find((object) => object.text.includes('請將手機橫向放置'));
    const heading = texts.find((object) => object.text.includes('ASHEN RELIQUARY: REBIRTH'));
    return {
      hintVisible: hint?.visible,
      headingWithinViewport: heading
        ? heading.getBounds().left >= 0 && heading.getBounds().right <= scene.scale.width
        : false,
    };
  });

  await expect.poll(async () => (await readGate()).hintVisible).toBe(false);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect.poll(async () => (await readGate()).hintVisible).toBe(true);
  await expect.poll(async () => (await readGate()).headingWithinViewport).toBe(true);
});

test('does not request legacy or placeholder artwork from the Rebirth entry', async ({ page }) => {
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.startsWith('/assets/') || path.startsWith('/legacy/') ||
        /(?:placeholder|temporary|proxy-art)/i.test(path)) {
      forbiddenRequests.push(path);
    }
  });
  await waitForRebirthGate(page);
  await page.waitForLoadState('networkidle');
  expect(forbiddenRequests).toEqual([]);
});
