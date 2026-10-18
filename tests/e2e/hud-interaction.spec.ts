import { test, expect } from '@playwright/test';

async function waitForGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });
}

test('decorative D HUD chrome does not intercept A/B gameplay pointers', async ({ page }) => {
  await waitForGame(page);
  const styles = await page.evaluate(() => {
    const pe = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('Missing HUD element: ' + selector);
      return getComputedStyle(element).pointerEvents;
    };
    return {
      root: pe('#hud-root'),
      stats: pe('.hud-stats'),
      hints: pe('.hud-hints'),
      fps: pe('.hud-fps'),
      inventoryAction: pe('.hud-actions'),
      inventoryButton: pe('[data-inventory]'),
    };
  });
  expect(styles).toEqual({
    root: 'none',
    stats: 'none',
    hints: 'none',
    fps: 'none',
    inventoryAction: 'auto',
    inventoryButton: 'auto',
  });

  // Action stays clickable even though the rest of the HUD is pass-through.
  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
});
