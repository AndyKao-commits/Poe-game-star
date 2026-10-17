import { test, expect } from '@playwright/test';

test.describe('Art D landscape action button layout', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test('action buttons fit within the viewport and display the delivered icons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene?.getScene?.('GameScene') as
        | { getOrientationGateForTests?: () => { setCoarsePointerForTests: (v: boolean) => void } | null }
        | undefined;
      return Boolean(scene?.getOrientationGateForTests);
    });
    await page.evaluate(() => {
      const scene = window.__ASHEN_GAME__?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => { setCoarsePointerForTests: (v: boolean) => void } | null;
      };
      scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
    });

    for (const selector of ['[data-attack]', '[data-skill-q]', '[data-skill-e]', '[data-dodge]']) {
      const button = page.locator(selector);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, `${selector} has bounds`).not.toBeNull();
      if (!box) continue;
      expect(box.x, `${selector} left`).toBeGreaterThanOrEqual(0);
      expect(box.y, `${selector} top`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${selector} right`).toBeLessThanOrEqual(844);
      expect(box.y + box.height, `${selector} bottom`).toBeLessThanOrEqual(390);
      if (selector !== '[data-dodge]') {
        await expect(button).toHaveCSS('background-image', new RegExp('assets/art-d/ui-(attack|skill)\\.png'));
      }
    }
  });
});
