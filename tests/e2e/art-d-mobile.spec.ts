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

    await expect(page.locator('[data-move-zone]')).toBeVisible();
    await expect(page.locator('[data-actions]')).toBeVisible();
    // Movement zone and attack cluster must not collide on a landscape phone.
    const moveZone = await page.locator('[data-move-zone]').boundingBox();
    const actions = await page.locator('[data-actions]').boundingBox();
    expect(moveZone).not.toBeNull();
    expect(actions).not.toBeNull();
    if (moveZone && actions) {
      const overlapWidth = Math.max(0, Math.min(moveZone.x + moveZone.width, actions.x + actions.width) - Math.max(moveZone.x, actions.x));
      const overlapHeight = Math.max(0, Math.min(moveZone.y + moveZone.height, actions.y + actions.height) - Math.max(moveZone.y, actions.y));
      expect(overlapWidth * overlapHeight, 'movement and action zones must not overlap').toBe(0);
    }

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
      // Detect visual button collisions independently of center hit testing.
      for (const previous of ['[data-attack]', '[data-skill-q]', '[data-skill-e]', '[data-dodge]']) {
        if (previous === selector) break;
        const other = await page.locator(previous).boundingBox();
        expect(other).not.toBeNull();
        if (!other) continue;
        const overlapWidth = Math.max(0, Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x));
        const overlapHeight = Math.max(0, Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y));
        expect(overlapWidth * overlapHeight, `${selector} must not overlap ${previous}`).toBe(0);
      }
      const hitTarget = await button.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const x = bounds.left + bounds.width / 2;
        const y = bounds.top + bounds.height / 2;
        const top = document.elementFromPoint(x, y);
        return top === element || element.contains(top);
      });
      expect(hitTarget, `${selector} center receives pointer input`).toBe(true);
      if (selector !== '[data-dodge]') {
        await expect(button).toHaveCSS('background-image', new RegExp('assets/art-d/ui-(attack|skill)\\.png'));
      }
    }
  });
});
