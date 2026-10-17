import { test, expect, devices } from '@playwright/test';

async function waitForGame(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });
}

test.describe('Phase 2 HUD / UI engineering', () => {
  test('desktop keeps keyboard hints and skill strip structure', async ({ page }) => {
    await waitForGame(page);
    await expect(page.locator('[data-hud-hints]')).toBeVisible();
    await expect(page.locator('[data-hud-hints]')).toContainText('Q');
    await expect(page.locator('[data-hud-skills]')).toBeVisible();
    await expect(page.locator('[data-hud-skill="dodge"]')).toHaveAttribute(
      'data-skill-state',
      'unavailable',
    );
  });

  test('decorative HUD panels do not intercept pointer events', async ({ page }) => {
    await waitForGame(page);
    const pe = await page.evaluate(() => {
      const stats = getComputedStyle(document.querySelector('.hud-stats')!);
      const fps = getComputedStyle(document.querySelector('.hud-fps')!);
      const hints = getComputedStyle(document.querySelector('.hud-hints')!);
      const root = getComputedStyle(document.getElementById('hud-root')!);
      return {
        root: root.pointerEvents,
        stats: stats.pointerEvents,
        fps: fps.pointerEvents,
        hints: hints.pointerEvents,
      };
    });
    expect(pe.root).toBe('none');
    expect(pe.stats).toBe('none');
    expect(pe.fps).toBe('none');
    expect(pe.hints).toBe('none');
  });

  test('gear modals stay closed without engineering C data', async ({ page }) => {
    await waitForGame(page);
    const opened = await page.evaluate(() => {
      const hud = document.getElementById('hud-root');
      return {
        invHidden: document.querySelector('[data-inventory-panel]')?.hasAttribute('hidden'),
        eqHidden: document.querySelector('[data-equipment-panel]')?.hasAttribute('hidden'),
        hasHud: !!hud,
      };
    });
    expect(opened.invHidden).toBe(true);
    expect(opened.eqHidden).toBe(true);
    expect(opened.hasHud).toBe(true);
  });
});

/** Coarse-pointer CSS only applies under real mobile device descriptors. */
test.describe('Phase 2 HUD / iPhone landscape', () => {
  const iphone = devices['iPhone 14 landscape'];
  test.use({
    userAgent: iphone.userAgent,
    viewport: iphone.viewport,
    deviceScaleFactor: iphone.deviceScaleFactor,
    isMobile: iphone.isMobile,
    hasTouch: iphone.hasTouch,
  });

  test('hides desktop hints and keeps skill cluster clear of move zone', async ({ page }) => {
    await waitForGame(page);
    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => {
          setCoarsePointerForTests: (v: boolean) => void;
        } | null;
      };
      scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
    });

    await expect(page.locator('[data-hud-hints]')).toBeHidden();
    await expect(page.locator('[data-hud-skills]')).toBeHidden();
    await expect(page.locator('[data-touch-layer]')).toBeVisible();

    const layout = await page.evaluate(() => {
      const stickZone = document.querySelector('[data-move-zone]')!.getBoundingClientRect();
      const actions = document.querySelector('[data-actions]')!.getBoundingClientRect();
      const q = document.querySelector('[data-skill-q]')!.getBoundingClientRect();
      const safeLeft = getComputedStyle(document.documentElement).getPropertyValue('--safe-left');
      const safeRight = getComputedStyle(document.documentElement).getPropertyValue(
        '--safe-right',
      );
      return {
        stickRight: stickZone.right,
        actionsLeft: actions.left,
        qLeft: q.left,
        safeLeft,
        safeRight,
        overlap: actions.left < stickZone.right - 8,
      };
    });

    expect(layout.overlap).toBe(false);
    expect(layout.qLeft).toBeGreaterThan(layout.stickRight - 4);
    expect(layout.safeLeft.length).toBeGreaterThan(0);
    expect(layout.safeRight.length).toBeGreaterThan(0);
  });
});
