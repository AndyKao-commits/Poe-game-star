import { test, expect, devices } from '@playwright/test';

const iphone = devices['iPhone 14 landscape'];
test.use({
  userAgent: iphone.userAgent,
  viewport: iphone.viewport,
  deviceScaleFactor: iphone.deviceScaleFactor,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
});

async function waitForGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getOrientationGateForTests: () => {
        setCoarsePointerForTests: (enabled: boolean) => void;
      } | null;
    };
    scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
  });
}

test('mobile shows one skill cluster, keeping touch skills available', async ({ page }) => {
  await waitForGame(page);
  await expect(page.locator('.hud-skills')).toBeHidden();
  await expect(page.locator('[data-skill-q]')).toBeVisible();
  await expect(page.locator('[data-skill-e]')).toBeVisible();
  await expect(page.locator('[data-dodge]')).toBeVisible();
  await expect(page.locator('[data-skill-q]')).toHaveAttribute('data-skill-state', 'ready');
});

test('mobile skill state restores immediately in the restart handler', async ({ page }) => {
  await waitForGame(page);
  const states = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => {
        stats: { hp: number };
        iframes: { clear: () => void };
        takeDamage: (damage: number) => void;
      };
      update: (time: number, delta: number) => void;
    };
    const player = scene.getPlayerForTests();
    player.iframes.clear();
    player.stats.hp = 1;
    player.takeDamage(999);
    scene.update(0, 16);
    const skill = document.querySelector('[data-skill-q]');
    const dead = skill?.getAttribute('data-skill-state');
    (document.querySelector('[data-restart]') as HTMLButtonElement).click();
    const after = skill?.getAttribute('data-skill-state');
    return { dead, after };
  });
  expect(states.dead).toBe('dead');
  expect(states.after).toBe('ready');
  await expect(page.locator('[data-death]')).toBeHidden();
});
