import { test, expect } from '@playwright/test';

test('A skill slash FX is disposed if encounter reset cancels animation tween', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.());
  });

  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => {
        spawnSlash: (angle: number) => void;
        slashEffects: Set<{ active: boolean }>;
        respawn: () => void;
      };
      tweens: { killAll: () => void };
    };
    const player = scene.getPlayerForTests();
    player.spawnSlash(0);
    const spawned = [...player.slashEffects];
    scene.tweens.killAll();
    player.respawn();
    return {
      spawned: spawned.length,
      remaining: player.slashEffects.size,
      allDestroyed: spawned.every((fx) => !fx.active),
    };
  });

  expect(result).toEqual({ spawned: 1, remaining: 0, allDestroyed: true });
});
