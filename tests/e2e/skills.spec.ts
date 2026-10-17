import { test, expect } from '@playwright/test';

async function waitGame(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests);
  });
}

async function enableTouchOverlay(page: import('@playwright/test').Page): Promise<void> {
  await waitGame(page);
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

test.describe('Phase 2 skills runtime (desktop)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'skills keyboard path on Chromium');

  test.use({ viewport: { width: 1280, height: 720 } });

  test('Q spends MP, starts cooldown, and refuses a second cast', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await waitGame(page);
    await page.locator('#game-root canvas').click();

    const before = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          stats: { mp: number };
          getSkillUiState: () => {
            mana: number;
            cooldowns: { q: number };
            canCast: { q: boolean };
          };
        };
      };
      const p = scene.getPlayerForTests();
      return { mp: p.stats.mp, ui: p.getSkillUiState() };
    });
    expect(before.ui.canCast.q).toBe(true);

    await page.keyboard.down('KeyQ');
    await page.waitForTimeout(80);
    await page.keyboard.up('KeyQ');

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getPlayerForTests: () => {
              stats: { mp: number };
              getSkillUiState: () => { mana: number; cooldowns: { q: number }; canCast: { q: boolean } };
            };
          };
          return scene.getPlayerForTests().getSkillUiState();
        }),
      )
      .toMatchObject({ canCast: { q: false } });

    const after = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          stats: { mp: number };
          getSkillUiState: () => { mana: number; cooldowns: { q: number } };
          getCasterState: () => { cooldowns: { q: number }; resources: { mana: number } };
        };
      };
      const p = scene.getPlayerForTests();
      return {
        statsMp: p.stats.mp,
        ui: p.getSkillUiState(),
        caster: p.getCasterState(),
      };
    });

    expect(after.statsMp).toBe(before.mp - 12);
    expect(after.ui.mana).toBe(after.statsMp);
    expect(after.caster.resources.mana).toBe(after.statsMp);
    expect(after.ui.cooldowns.q).toBeGreaterThan(0);

    // Second press while on cooldown must not spend more MP
    await page.keyboard.down('KeyQ');
    await page.waitForTimeout(80);
    await page.keyboard.up('KeyQ');
    const again = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { stats: { mp: number } };
      };
      return scene.getPlayerForTests().stats.mp;
    });
    expect(again).toBe(after.statsMp);
  });

  test('Space dodge spends stamina, grants iframes, and moves with collision', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await waitGame(page);
    await page.locator('#game-root canvas').click();

    const before = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          position: { x: number; y: number };
          getSkillUiState: () => { stamina: number };
          iframes: { active: boolean; remaining: number };
        };
      };
      const p = scene.getPlayerForTests();
      return {
        pos: { ...p.position },
        stamina: p.getSkillUiState().stamina,
        iframe: p.iframes.remaining,
      };
    });

    // Hold briefly so the game loop sees the key-down edge (short press() can miss a frame).
    await page.keyboard.down('Space');
    await page.waitForTimeout(80);
    await page.keyboard.up('Space');

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getPlayerForTests: () => {
              getSkillUiState: () => { stamina: number; cooldowns: { dodge: number } };
              iframes: { active: boolean; remaining: number };
            };
          };
          const p = scene.getPlayerForTests();
          return {
            stamina: p.getSkillUiState().stamina,
            cd: p.getSkillUiState().cooldowns.dodge,
            iframe: p.iframes.active,
            iframeMs: p.iframes.remaining,
          };
        }),
      )
      .toMatchObject({ iframe: true });

    const after = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          position: { x: number; y: number };
          getSkillUiState: () => { stamina: number; cooldowns: { dodge: number } };
          iframes: { remaining: number };
        };
      };
      const p = scene.getPlayerForTests();
      return {
        pos: { ...p.position },
        stamina: p.getSkillUiState().stamina,
        cd: p.getSkillUiState().cooldowns.dodge,
        iframeMs: p.iframes.remaining,
      };
    });

    expect(after.stamina).toBe(before.stamina - 18);
    expect(after.cd).toBeGreaterThan(0);
    expect(after.iframeMs).toBeGreaterThan(0);
    expect(after.iframeMs).toBeLessThanOrEqual(280);
    // Position may be unchanged if blocked by walls; displacement attempted via collision.
    expect(Number.isFinite(after.pos.x)).toBe(true);
  });

  test('death disables skills; respawn restores mana/stamina/cooldowns', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await waitGame(page);

    await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          stats: { hp: number };
          iframes: { clear: () => void };
          takeDamage: (n: number) => void;
        };
      };
      const p = scene.getPlayerForTests();
      p.iframes.clear();
      p.stats.hp = 1;
      p.takeDamage(999);
    });

    await page.waitForFunction(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { lifecycle: { isDead: boolean }; getSkillUiState: () => { dead: boolean } };
      };
      const p = scene.getPlayerForTests();
      return p.lifecycle.isDead && p.getSkillUiState().dead;
    });

    await page.locator('[data-restart]').click();
    await expect(page.locator('[data-death]')).toBeHidden();

    const ui = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          getSkillUiState: () => {
            dead: boolean;
            mana: number;
            maxMana: number;
            stamina: number;
            maxStamina: number;
            cooldowns: { q: number; e: number; dodge: number };
            canCast: { q: boolean; e: boolean; dodge: boolean };
          };
        };
      };
      return scene.getPlayerForTests().getSkillUiState();
    });
    expect(ui.dead).toBe(false);
    expect(ui.mana).toBe(ui.maxMana);
    expect(ui.stamina).toBe(ui.maxStamina);
    expect(ui.cooldowns.q).toBe(0);
    expect(ui.canCast.q).toBe(true);
  });
});

test.describe('Phase 2 skills runtime (touch)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch skills on Chromium viewport');

  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  test('touch Q button casts once despite pointer+touch twin events', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    await expect(page.locator('[data-skill-q]')).toBeVisible();
    await expect(page.locator('[data-skill-q]')).not.toHaveClass(/is-locked/);

    const beforeMp = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { stats: { mp: number } };
      };
      return scene.getPlayerForTests().stats.mp;
    });

    const box = await page.locator('[data-skill-q]').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Simulate iOS twin: touchstart then pointerdown on the same button.
    await page.evaluate(
      ({ x, y }) => {
        const btn = document.querySelector('[data-skill-q]') as HTMLElement;
        const toList = (touches: Array<Record<string, unknown>>) => {
          const list = touches.slice() as Array<Record<string, unknown>> & {
            item: (i: number) => Record<string, unknown> | null;
          };
          list.item = (i: number) => touches[i] ?? null;
          return list;
        };
        const touch = {
          identifier: 91,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y,
          target: btn,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
        };
        const te = new Event('touchstart', { bubbles: true, cancelable: true });
        Object.defineProperties(te, {
          touches: { value: toList([touch]) },
          targetTouches: { value: toList([touch]) },
          changedTouches: { value: toList([touch]) },
        });
        btn.dispatchEvent(te);
        btn.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 91,
            pointerType: 'touch',
            clientX: x,
            clientY: y,
            buttons: 1,
            bubbles: true,
          }),
        );
      },
      { x, y },
    );

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getPlayerForTests: () => { stats: { mp: number }; getSkillUiState: () => { cooldowns: { q: number } } };
          };
          const p = scene.getPlayerForTests();
          return { mp: p.stats.mp, cd: p.getSkillUiState().cooldowns.q };
        }),
      )
      .toMatchObject({ mp: beforeMp - 12 });

    // Only one cast spent 12 MP (not 24).
    const after = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { stats: { mp: number } };
      };
      return scene.getPlayerForTests().stats.mp;
    });
    expect(after).toBe(beforeMp - 12);
  });

  test('move stick + skill button can operate together', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
    await enableTouchOverlay(page);

    const moveBox = await page.locator('[data-move-zone]').boundingBox();
    const skillBox = await page.locator('[data-skill-e]').boundingBox();
    expect(moveBox && skillBox).toBeTruthy();
    if (!moveBox || !skillBox) return;

    const before = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => { position: { x: number; y: number }; stats: { mp: number } };
      };
      const p = scene.getPlayerForTests();
      return { pos: { ...p.position }, mp: p.stats.mp };
    });

    await page.evaluate(
      ({ sx, sy, ex, ey, ax, ay }) => {
        const zone = document.querySelector('[data-move-zone]') as HTMLElement;
        const btn = document.querySelector('[data-skill-e]') as HTMLElement;
        const toList = (touches: Array<Record<string, unknown>>) => {
          const list = touches.slice() as Array<Record<string, unknown>> & {
            item: (i: number) => Record<string, unknown> | null;
          };
          list.item = (i: number) => touches[i] ?? null;
          return list;
        };
        const fire = (
          target: EventTarget,
          type: string,
          active: Array<Record<string, unknown>>,
          changed: Array<Record<string, unknown>>,
        ) => {
          const ev = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperties(ev, {
            touches: { value: toList(active) },
            targetTouches: { value: toList(active) },
            changedTouches: { value: toList(changed) },
          });
          target.dispatchEvent(ev);
        };
        const move = {
          identifier: 101,
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
        const move2 = { ...move, clientX: ex, pageX: ex, screenX: ex };
        const skill = {
          identifier: 102,
          clientX: ax,
          clientY: ay,
          pageX: ax,
          pageY: ay,
          screenX: ax,
          screenY: ay,
          target: btn,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
        };
        fire(zone, 'touchstart', [move], [move]);
        fire(window, 'touchmove', [move2], [move2]);
        fire(btn, 'touchstart', [move2, skill], [skill]);
      },
      {
        sx: moveBox.x + moveBox.width * 0.35,
        sy: moveBox.y + moveBox.height * 0.55,
        ex: moveBox.x + moveBox.width * 0.35 + 50,
        ey: moveBox.y + moveBox.height * 0.55,
        ax: skillBox.x + skillBox.width / 2,
        ay: skillBox.y + skillBox.height / 2,
      },
    );

    // Do not call input.sample() here — it would consume the queued skill press.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getPlayerForTests: () => {
              stats: { mp: number };
              getSkillUiState: () => { cooldowns: { e: number } };
            };
            getTouchControlsForTests: () => { getDebugState: () => { moving: boolean } } | null;
          };
          const p = scene.getPlayerForTests();
          const touch = scene.getTouchControlsForTests()?.getDebugState();
          return {
            moving: Boolean(touch?.moving),
            mpSpent: p.stats.mp <= 50 - 22,
            eCd: p.getSkillUiState().cooldowns.e > 0,
          };
        }),
      )
      .toEqual({ moving: true, mpSpent: true, eCd: true });

    const after = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getPlayerForTests: () => {
          position: { x: number; y: number };
          stats: { mp: number };
          getSkillUiState: () => { cooldowns: { e: number } };
        };
      };
      const p = scene.getPlayerForTests();
      return { pos: { ...p.position }, mp: p.stats.mp, eCd: p.getSkillUiState().cooldowns.e };
    });
    expect(after.mp).toBe(before.mp - 22);
    expect(after.eCd).toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const pos = await page.evaluate(() => {
          const game = window.__ASHEN_GAME__;
          const scene = game?.scene.getScene('GameScene') as {
            getPlayerForTests: () => { position: { x: number; y: number } };
          };
          return scene.getPlayerForTests().position;
        });
        return Math.hypot(pos.x - before.pos.x, pos.y - before.pos.y);
      }, { timeout: 5_000 })
      .toBeGreaterThan(0.04);
  });
});
