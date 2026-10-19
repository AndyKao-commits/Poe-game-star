import { test, expect } from '@playwright/test';

test('C inventory status is announced and rendered as text, never markup', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getInventoryOpenForTests?: () => boolean }
      | undefined;
    return typeof scene?.getInventoryOpenForTests === 'function';
  });
  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      inventoryPanel: { setStatus: (value: string) => void; render: (kit: unknown) => void };
      gearKit: unknown;
    };
    scene.inventoryPanel.setStatus('<img src=x onerror=alert(1)>');
    scene.inventoryPanel.render(scene.gearKit);
  });
  const status = page.locator('[data-inv-status]');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveText('<img src=x onerror=alert(1)>');
  await expect(status.locator('img')).toHaveCount(0);
});
