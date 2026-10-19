import { test, expect } from '@playwright/test';

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

test('loads the playable prototype shell', async ({ page }) => {
  await waitForGame(page);
  await expect(page.locator('[data-hp-text]')).toHaveText(/120\/120/);
  await expect(page.locator('[data-mp-text]')).toHaveText(/60\/60/);
  await expect(page.locator('.hud-hints')).toContainText('移動');
  await expect(page.locator('[data-fps]')).toContainText('FPS');
  await expect(page.locator('[data-death]')).toBeHidden();
});

test('supports move, attack, death, and full encounter restart', async ({ page }) => {
  await waitForGame(page);

  const canvas = page.locator('#game-root canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyD');
  await page.mouse.click(420, 320);

  const spawnCount = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getEnemyCountForTests: () => number;
    };
    return scene.getEnemyCountForTests();
  });
  expect(spawnCount).toBeGreaterThan(0);

  // Cycle death → full reset twice (regression for leftover AI / positions)
  for (let i = 0; i < 2; i++) {
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
      // Clear spawn-grace / combat i-frames so the forced kill is accepted
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

    await expect(page.locator('[data-death]')).toBeVisible();
    await page.locator('[data-restart]').click();
    await expect(page.locator('[data-death]')).toBeHidden();
    await expect(page.locator('[data-hp-text]')).toHaveText(/120\/120/);

    const after = await page.evaluate(() => {
      const game = window.__ASHEN_GAME__;
      const scene = game?.scene.getScene('GameScene') as {
        getEnemyCountForTests: () => number;
        getSpawnGraceForTests: () => number;
        getRestartCount: () => number;
        getPlayerForTests: () => {
          stats: { hp: number; mp: number };
          lifecycle: { isDead: boolean };
        };
      };
      const player = scene.getPlayerForTests();
      return {
        enemies: scene.getEnemyCountForTests(),
        grace: scene.getSpawnGraceForTests(),
        restarts: scene.getRestartCount(),
        hp: player.stats.hp,
        mp: player.stats.mp,
        dead: player.lifecycle.isDead,
      };
    });

    expect(after.enemies).toBe(spawnCount);
    expect(after.grace).toBeGreaterThan(0);
    expect(after.restarts).toBe(i + 1);
    expect(after.hp).toBe(120);
    expect(after.mp).toBe(60);
    expect(after.dead).toBe(false);
  }
});
