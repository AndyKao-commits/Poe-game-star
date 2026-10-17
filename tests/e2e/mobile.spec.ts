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

async function readPlayerPos(page: import('@playwright/test').Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getPlayerForTests: () => { position: { x: number; y: number } };
    };
    const p = scene.getPlayerForTests().position;
    return { x: p.x, y: p.y };
  });
}

async function readInputSample(page: import('@playwright/test').Page): Promise<{
  moving: boolean;
  attackHeld: boolean;
  moveX: number;
  moveY: number;
}> {
  return page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getInputForTests: () => {
        sample: () => { moving: boolean; attackHeld: boolean; moveX: number; moveY: number };
      };
    };
    return scene.getInputForTests().sample();
  });
}

type TouchLike = {
  identifier: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  target: EventTarget;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;
};

/** Dispatch TouchEvent sequence (iOS-like path) on the move zone. */
async function touchDragMove(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  identifier = 11,
): Promise<void> {
  await page.evaluate(
    ({ sx, sy, ex, ey, id }) => {
      const zone = document.querySelector('[data-move-zone]') as HTMLElement;
      const toList = (touches: TouchLike[]) => {
        const list = touches.slice() as TouchLike[] & { item: (i: number) => TouchLike | null };
        list.item = (i: number) => touches[i] ?? null;
        return list;
      };
      const startTouch: TouchLike = {
        identifier: id,
        clientX: sx,
        clientY: sy,
        pageX: sx,
        pageY: sy,
        screenX: sx,
        screenY: sy,
        target: zone,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
      };
      const moveTouch: TouchLike = {
        ...startTouch,
        clientX: ex,
        clientY: ey,
        pageX: ex,
        pageY: ey,
        screenX: ex,
        screenY: ey,
      };

      const fire = (type: string, active: TouchLike[], changed: TouchLike[]) => {
        const ev = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(ev, {
          touches: { value: toList(active) },
          targetTouches: { value: toList(active) },
          changedTouches: { value: toList(changed) },
        });
        (type === 'touchstart' ? zone : window).dispatchEvent(ev);
      };

      fire('touchstart', [startTouch], [startTouch]);
      fire('touchmove', [moveTouch], [moveTouch]);
    },
    { sx: from.x, sy: from.y, ex: to.x, ey: to.y, id: identifier },
  );
}

async function touchEndMove(
  page: import('@playwright/test').Page,
  at: { x: number; y: number },
  identifier = 11,
): Promise<void> {
  await page.evaluate(
    ({ x, y, id }) => {
      const zone = document.querySelector('[data-move-zone]') as HTMLElement;
      const touch: TouchLike = {
        identifier: id,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
        target: zone,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 0,
      };
      const toList = (touches: TouchLike[]) => {
        const list = touches.slice() as TouchLike[] & { item: (i: number) => TouchLike | null };
        list.item = (i: number) => touches[i] ?? null;
        return list;
      };
      const ev = new Event('touchend', { bubbles: true, cancelable: true });
      Object.defineProperties(ev, {
        touches: { value: toList([]) },
        targetTouches: { value: toList([]) },
        changedTouches: { value: toList([touch]) },
      });
      window.dispatchEvent(ev);
    },
    { x: at.x, y: at.y, id: identifier },
  );
}

test.describe('mobile landscape controls', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'mobile overlay verified on Chromium viewport simulation');

  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  test('settings remain usable after fully hiding visuals', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    await expect(page.locator('[data-touch-settings]')).toBeVisible();
    await expect(page.locator('[data-mode]')).toBeVisible();

    // hidden → always → fade must be recoverable from the independent settings entry
    await page.locator('[data-mode]').selectOption('hidden');
    await expect(page.locator('[data-mode]')).toHaveValue('hidden');
    await expect(page.locator('[data-touch-settings]')).toBeVisible();
    await expect(page.locator('[data-touch-visual]')).toHaveCSS('opacity', '0');

    await page.locator('[data-mode]').selectOption('always');
    await expect(page.locator('[data-mode]')).toHaveValue('always');
    // always mode uses CONTROL_ACTIVE_OPACITY (0.75), not full 1
    await expect(page.locator('[data-touch-visual]')).toHaveCSS('opacity', '0.75');

    await page.locator('[data-mode]').selectOption('fade');
    await expect(page.locator('[data-mode]')).toHaveValue('fade');

    const modeAfter = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getTouchControlsForTests: () => { currentMode: string } | null;
      };
      return scene.getTouchControlsForTests()?.currentMode;
    });
    expect(modeAfter).toBe('fade');
  });

  test('attack button receives clicks above hit zones', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    await expect(page.locator('[data-attack]')).toBeVisible();

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

    await expect.poll(async () => (await readInputSample(page)).attackHeld).toBe(true);

    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 31,
          pointerType: 'touch',
          bubbles: true,
        }),
      );
    });

    await expect.poll(async () => (await readInputSample(page)).attackHeld).toBe(false);
  });

  test('touch drag changes player world coordinates and release stops', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    const box = await page.locator('[data-move-zone]').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const start = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.55 };
    const right = { x: start.x + 70, y: start.y };
    const before = await readPlayerPos(page);

    await touchDragMove(page, start, right, 21);
    await expect.poll(async () => (await readInputSample(page)).moving).toBe(true);

    await expect
      .poll(async () => {
        const pos = await readPlayerPos(page);
        return Math.hypot(pos.x - before.x, pos.y - before.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.05);

    const mid = await readPlayerPos(page);
    await touchEndMove(page, right, 21);

    await expect.poll(async () => (await readInputSample(page)).moving).toBe(false);

    // After release, position should stabilize (no further intentional drift)
    await page.waitForTimeout(200);
    const afterStop = await readPlayerPos(page);
    expect(Math.hypot(afterStop.x - mid.x, afterStop.y - mid.y)).toBeLessThan(0.08);
  });

  test('touch joystick directions map correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    const box = await page.locator('[data-move-zone]').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const origin = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.55 };

    // Screen-right drag → isometric world (+x/-y-ish from screenDeltaToWorldMove)
    await touchDragMove(page, origin, { x: origin.x + 60, y: origin.y }, 31);
    const right = await readInputSample(page);
    expect(right.moving).toBe(true);
    expect(Math.abs(right.moveX) + Math.abs(right.moveY)).toBeGreaterThan(0.2);
    await touchEndMove(page, { x: origin.x + 60, y: origin.y }, 31);

    await touchDragMove(page, origin, { x: origin.x - 60, y: origin.y }, 32);
    const left = await readInputSample(page);
    expect(left.moving).toBe(true);
    // Opposite horizontal screen drag should invert world X relative to right
    expect(Math.sign(left.moveX)).not.toBe(Math.sign(right.moveX) || 1);
    await touchEndMove(page, { x: origin.x - 60, y: origin.y }, 32);

    await touchDragMove(page, origin, { x: origin.x, y: origin.y - 60 }, 33);
    const up = await readInputSample(page);
    expect(up.moving).toBe(true);
    await touchEndMove(page, { x: origin.x, y: origin.y - 60 }, 33);

    await touchDragMove(page, origin, { x: origin.x, y: origin.y + 60 }, 34);
    const down = await readInputSample(page);
    expect(down.moving).toBe(true);
    expect(Math.sign(down.moveY)).not.toBe(Math.sign(up.moveY) || 1);
    await touchEndMove(page, { x: origin.x, y: origin.y + 60 }, 34);
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
    const before = await readPlayerPos(page);

    // Left move via TouchEvent + right attack via PointerEvent simultaneously
    await touchDragMove(page, start, { x: start.x + 40, y: start.y }, 41);
    await page.evaluate(({ ax, ay }) => {
      const btn = document.querySelector('[data-attack]') as HTMLElement;
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
    }, { ax: atk.x, ay: atk.y });

    const sample = await readInputSample(page);
    expect(sample.moving).toBe(true);
    expect(sample.attackHeld).toBe(true);
    expect(Math.hypot(sample.moveX, sample.moveY)).toBeLessThan(0.95);

    await expect
      .poll(async () => {
        const pos = await readPlayerPos(page);
        return Math.hypot(pos.x - before.x, pos.y - before.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.04);

    await touchEndMove(page, { x: start.x + 40, y: start.y }, 41);
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 42, bubbles: true }));
    });
  });

  test('pointer-path drag also moves the player (desktop-touch hybrid)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    const box = await page.locator('[data-move-zone]').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const sx = box.x + box.width * 0.35;
    const sy = box.y + box.height * 0.55;
    const before = await readPlayerPos(page);

    await page.evaluate(({ x, y }) => {
      const zone = document.querySelector('[data-move-zone]') as HTMLElement;
      zone.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 51,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          buttons: 1,
          bubbles: true,
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 51,
          pointerType: 'touch',
          clientX: x + 55,
          clientY: y,
          buttons: 1,
          bubbles: true,
        }),
      );
    }, { x: sx, y: sy });

    await expect.poll(async () => (await readInputSample(page)).moving).toBe(true);
    await expect
      .poll(async () => {
        const pos = await readPlayerPos(page);
        return Math.hypot(pos.x - before.x, pos.y - before.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.05);

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 51, bubbles: true }));
    });
    await expect.poll(async () => (await readInputSample(page)).moving).toBe(false);
  });

  test('hidden mode keeps move + attack hit zones working', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    await page.locator('[data-mode]').selectOption('hidden');
    await expect(page.locator('[data-touch-visual]')).toHaveCSS('opacity', '0');

    const box = await page.locator('[data-move-zone]').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const start = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 };
    const before = await readPlayerPos(page);

    await touchDragMove(page, start, { x: start.x + 50, y: start.y }, 61);
    await expect
      .poll(async () => {
        const pos = await readPlayerPos(page);
        return Math.hypot(pos.x - before.x, pos.y - before.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.04);
    await touchEndMove(page, { x: start.x + 50, y: start.y }, 61);
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

test.describe('desktop WASD regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'desktop path verified on Chromium');

  test.use({
    viewport: { width: 1280, height: 720 },
    isMobile: false,
    hasTouch: false,
  });

  test('WASD still moves the player', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });

    const before = await readPlayerPos(page);
    await page.locator('#game-root canvas').click();
    await page.keyboard.down('KeyD');
    await expect
      .poll(async () => {
        const pos = await readPlayerPos(page);
        return Math.hypot(pos.x - before.x, pos.y - before.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.05);
    await page.keyboard.up('KeyD');
  });
});
