import { test, expect } from '@playwright/test';

test.describe('mobile landscape controls', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'mobile overlay verified on Chromium');

  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  test('shows touch overlay and responds to joystick + attack', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });

    await page.waitForFunction(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene?.getScene?.('GameScene') as
        | { getOrientationGateForTests?: () => unknown }
        | undefined;
      return Boolean(scene?.getOrientationGateForTests);
    });

    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => {
          setCoarsePointerForTests: (v: boolean) => void;
        } | null;
      };
      scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
    });

    await expect(page.locator('[data-touch-layer]')).toBeVisible();
    await expect(page.locator('[data-attack]')).toBeVisible();
    await expect(page.locator('[data-skill-q]')).toBeDisabled();

    const moveZone = page.locator('[data-move-zone]');
    const box = await moveZone.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const start = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 };

    await page.evaluate(async ({ sx, sy }) => {
      const zone = document.querySelector('[data-move-zone]') as HTMLElement;
      zone.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 21,
          pointerType: 'touch',
          clientX: sx,
          clientY: sy,
          buttons: 1,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 21,
          pointerType: 'touch',
          clientX: sx + 60,
          clientY: sy,
          buttons: 1,
          bubbles: true,
        }),
      );
    }, { sx: start.x, sy: start.y });

    await page.waitForTimeout(120);

    const moving = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getInputForTests: () => { sample: () => { moving: boolean; moveX: number; moveY: number } };
      };
      return scene.getInputForTests().sample();
    });
    expect(moving.moving).toBe(true);
    expect(Math.abs(moving.moveX) + Math.abs(moving.moveY)).toBeGreaterThan(0);

    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 21,
          pointerType: 'touch',
          bubbles: true,
        }),
      );
    });

    const idle = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getInputForTests: () => { sample: () => { moving: boolean } };
      };
      return scene.getInputForTests().sample().moving;
    });
    expect(idle).toBe(false);
  });
});

test.describe('mobile portrait gate', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'portrait gate verified on Chromium');

  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('shows rotate prompt in portrait and hides touch controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });

    await page.waitForFunction(() => Boolean(window.__ASHEN_GAME__));
    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => {
          setCoarsePointerForTests: (v: boolean) => void;
        } | null;
      };
      scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
    });

    await expect(page.locator('[data-orient]')).toBeVisible();
    await expect(page.locator('[data-orient]')).toContainText('橫向');
    await expect(page.locator('[data-start]')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const touch = document.getElementById('touch-root') as HTMLElement | null;
          return Boolean(touch?.hidden);
        }),
      )
      .toBe(true);
  });
});
