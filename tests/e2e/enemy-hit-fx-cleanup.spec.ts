import { test, expect } from '@playwright/test';

test('enemy destruction cleans active Art D hit effects after tween cancellation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getEnemyCountForTests?: () => number }
      | undefined;
    return (scene?.getEnemyCountForTests?.() ?? 0) > 0;
  });

  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      enemies: Array<{
        takeDamage: (damage: number) => unknown;
        destroy: () => void;
        hitEffects: Set<{ active: boolean }>;
      }>;
      tweens: { killAll: () => void };
      textures: { exists: (key: string) => boolean };
    };
    if (!scene.textures.exists('art-d-hit')) throw new Error('Art D hit texture missing');
    const enemy = scene.enemies[0];
    enemy.takeDamage(1);
    const effects = [...enemy.hitEffects];
    if (effects.length === 0) throw new Error('Expected a spawned hit effect');
    scene.tweens.killAll(); // Encounter reset cancels transient animation completion.
    enemy.destroy();
    return {
      created: effects.length,
      remaining: enemy.hitEffects.size,
      allDestroyed: effects.every((fx) => !fx.active),
    };
  });
  expect(result.created).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
  expect(result.allDestroyed).toBe(true);
});
