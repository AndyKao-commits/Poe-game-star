import { test, expect } from '@playwright/test';

async function enableTouchOverlay(page: import('@playwright/test').Page): Promise<void> {
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
}

test.describe('mobile landscape controls', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'mobile overlay verified on Chromium viewport simulation');

  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  test('attack button and mode select receive real clicks above hit zones', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    await expect(page.locator('[data-touch-layer]')).toBeVisible();
    await expect(page.locator('[data-attack]')).toBeVisible();

    // Mode select must be clickable (not covered by attack-zone)
    await page.locator('[data-mode]').selectOption('always');
    await expect(page.locator('[data-mode]')).toHaveValue('always');
    const modeAfter = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getTouchControlsForTests: () => { currentMode: string } | null;
      };
      return scene.getTouchControlsForTests()?.currentMode;
    });
    expect(modeAfter).toBe('always');

    await page.locator('[data-mode]').selectOption('hidden');
    expect(
      await page.evaluate(() => {
        const game = window.__ASHEN_GAME__;
        const scene = game?.scene.getScene('GameScene') as {
          getTouchControlsForTests: () => { currentMode: string } | null;
        };
        return scene.getTouchControlsForTests()?.currentMode;
      }),
    ).toBe('hidden');

    await page.locator('[data-mode]').selectOption('fade');

    // Real click on attack button → attackHeld true, then release
    await page.locator('[data-attack]').click({ force: false });
    // pointerdown/up via click is momentary; hold via pointer events on the button
    const attackBox = await page.locator('[data-attack]').boundingBox();
    expect(attackBox).toBeTruthy();
    if (!attackBox) return;

    await page.evaluate(({ x, y }) => {
      const btn = document.querySelector('[data-attack]') as HTMLElement;
      btn.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 31,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          buttons: 1,
          bubbles: true,
        }),
      );
    }, { x: attackBox.x + attackBox.width / 2, y: attackBox.y + attackBox.height / 2 });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getInputForTests: () => { sample: () => { attackHeld: boolean } };
          };
          return scene.getInputForTests().sample().attackHeld;
        }),
      )
      .toBe(true);

    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 31,
          pointerType: 'touch',
          bubbles: true,
        }),
      );
    });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getInputForTests: () => { sample: () => { attackHeld: boolean } };
          };
          return scene.getInputForTests().sample().attackHeld;
        }),
      )
      .toBe(false);
  });

  test('dual stick + attack and analog movement work together', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    const moveZone = page.locator('[data-move-zone]');
    const box = await moveZone.boundingBox();
    const attackBox = await page.locator('[data-attack]').boundingBox();
    expect(box && attackBox).toBeTruthy();
    if (!box || !attackBox) return;

    const start = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.55 };
    const atk = {
      x: attackBox.x + attackBox.width / 2,
      y: attackBox.y + attackBox.height / 2,
    };

    // Left move + right attack simultaneously (separate pointerIds)
    await page.evaluate(({ sx, sy, ax, ay }) => {
      const zone = document.querySelector('[data-move-zone]') as HTMLElement;
      const btn = document.querySelector('[data-attack]') as HTMLElement;
      zone.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 41,
          pointerType: 'touch',
          clientX: sx,
          clientY: sy,
          buttons: 1,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 41,
          pointerType: 'touch',
          clientX: sx + 24,
          clientY: sy,
          buttons: 1,
          bubbles: true,
        }),
      );
      btn.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 42,
          pointerType: 'touch',
          clientX: ax,
          clientY: ay,
          buttons: 1,
          bubbles: true,
        }),
      );
    }, { sx: start.x, sy: start.y, ax: atk.x, ay: atk.y });

    const sample = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getInputForTests: () => {
          sample: () => { moving: boolean; attackHeld: boolean; moveX: number; moveY: number };
        };
      };
      return scene.getInputForTests().sample();
    });
    expect(sample.moving).toBe(true);
    expect(sample.attackHeld).toBe(true);
    // Partial stick throw should be slower than full (intensity < 1)
    expect(Math.hypot(sample.moveX, sample.moveY)).toBeLessThan(0.95);

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, bubbles: true }));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 42, bubbles: true }));
    });
  });

  test('hides controls on death and restores after respawn', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);
    await expect(page.locator('#touch-root')).not.toBeHidden();

    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          stats: { hp: number };
          iframes: { clear: () => void };
          takeDamage: (n: number) => void;
        };
      };
      const player = scene.getPlayerForTests();
      player.iframes.clear();
      player.stats.hp = 1;
      player.takeDamage(999);
    });

    await page.waitForFunction(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { lifecycle: { isDead: boolean } };
      };
      return scene.getPlayerForTests().lifecycle.isDead;
    });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const touch = document.getElementById('touch-root') as HTMLElement | null;
          return Boolean(touch?.hidden);
        }),
      )
      .toBe(true);

    // Input cleared
    expect(
      await page.evaluate(() => {
        const game = window.__ASHEN_GAME__;
        const scene = game?.scene.getScene('GameScene') as {
          getInputForTests: () => { sample: () => { moving: boolean; attackHeld: boolean } };
        };
        const s = scene.getInputForTests().sample();
        return s.moving || s.attackHeld;
      }),
    ).toBe(false);

    await page.locator('[data-restart]').click();
    await expect(page.locator('[data-death]')).toBeHidden();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const touch = document.getElementById('touch-root') as HTMLElement | null;
          return touch ? !touch.hidden : false;
        }),
      )
      .toBe(true);

    // Simulate rotate to portrait then back to landscape
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => { refresh: () => void } | null;
      };
      scene.getOrientationGateForTests()?.refresh();
    });
    await expect.poll(async () => page.locator('#touch-root').evaluate((el) => (el as HTMLElement).hidden)).toBe(true);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getOrientationGateForTests: () => {
          setCoarsePointerForTests: (v: boolean) => void;
          refresh: () => void;
        } | null;
      };
      const gate = scene.getOrientationGateForTests();
      gate?.setCoarsePointerForTests(true);
      gate?.refresh();
    });
    await expect.poll(async () => page.locator('#touch-root').evaluate((el) => (el as HTMLElement).hidden)).toBe(false);
  });
});

test.describe('mobile portrait gate', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'portrait gate verified on Chromium viewport simulation');

  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('shows rotate prompt in portrait and hides touch controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

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
