import { test, expect } from '@playwright/test';

test('loads the playable prototype shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-hp-text]')).toHaveText(/100\/100/);
  await expect(page.locator('[data-mp-text]')).toHaveText(/50\/50/);
  await expect(page.locator('.hud-hints')).toContainText('移動');
  await expect(page.locator('[data-fps]')).toContainText('FPS');
  await expect(page.locator('[data-death]')).toBeHidden();
});

test('supports death overlay and restart after fatal damage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });

  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });

  await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getPlayerForTests: () => {
        stats: { hp: number };
        takeDamage: (n: number) => void;
      };
    };
    const player = scene.getPlayerForTests();
    player.stats.hp = 1;
    player.takeDamage(999);
  });

  await expect(page.locator('[data-death]')).toBeVisible();
  await expect(page.locator('[data-restart]')).toBeVisible();
  await page.locator('[data-restart]').click();
  await expect(page.locator('[data-death]')).toBeHidden();
  await expect(page.locator('[data-hp-text]')).toHaveText(/100\/100/);
});
