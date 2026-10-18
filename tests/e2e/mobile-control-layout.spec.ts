import { test, expect, devices } from '@playwright/test';

const iphone = devices['iPhone 14 landscape'];
test.use({
  userAgent: iphone.userAgent,
  viewport: iphone.viewport,
  deviceScaleFactor: iphone.deviceScaleFactor,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
});

test('mobile landscape separates C inventory, movement, and A skill controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getOrientationGateForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getOrientationGateForTests?.());
  });
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getOrientationGateForTests: () => { setCoarsePointerForTests: (value: boolean) => void } | null;
    };
    scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
  });

  const layout = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('Missing ' + selector);
      const b = element.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    };
    const intersects = (a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

    const movement = bounds('[data-move-zone]');
    const actions = bounds('[data-actions]');
    const inventory = bounds('[data-inventory]');
    const settings = bounds('[data-touch-settings]');
    const q = bounds('[data-skill-q]');
    const e = bounds('[data-skill-e]');
    const dodge = bounds('[data-dodge]');
    const attack = bounds('[data-attack]');
    return {
      movementActionsOverlap: intersects(movement, actions),
      inventorySettingsOverlap: intersects(inventory, settings),
      inventoryActionOverlap: intersects(inventory, actions),
      skillOutsideViewport: [q, e, dodge, attack].some((b) =>
        b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight
      ),
      inventoryOutsideViewport: inventory.left < 0 || inventory.top < 0 ||
        inventory.right > innerWidth || inventory.bottom > innerHeight,
    };
  });

  expect(layout).toEqual({
    movementActionsOverlap: false,
    inventorySettingsOverlap: false,
    inventoryActionOverlap: false,
    skillOutsideViewport: false,
    inventoryOutsideViewport: false,
  });
});
