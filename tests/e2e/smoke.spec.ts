import { test, expect } from '@playwright/test';

test('loads the playable prototype shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-hp-text]')).toHaveText(/100\/100/);
  await expect(page.locator('[data-mp-text]')).toHaveText(/50\/50/);
  await expect(page.locator('.hud-hints')).toContainText('移動');
  await expect(page.locator('[data-fps]')).toContainText('FPS');
});
