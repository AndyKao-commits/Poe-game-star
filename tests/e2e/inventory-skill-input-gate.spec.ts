import { test, expect } from '@playwright/test';

test('C inventory rejects queued A touch skills and does not replay a stale cast after close', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getInputForTests?: () => unknown }
      | undefined;
    return Boolean(scene?.getInputForTests?.());
  });

  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      setInventoryOpen: (open: boolean) => void;
      getInputForTests: () => {
        isEnabled: boolean;
        queueSkillPress: (id: string) => void;
        sample: () => { skillPresses: string[]; attackHeld: boolean; moving: boolean };
      };
    };
    const input = scene.getInputForTests();

    input.queueSkillPress('q');
    scene.setInventoryOpen(true);
    input.queueSkillPress('e');
    const during = { enabled: input.isEnabled, input: input.sample() };

    scene.setInventoryOpen(false);
    const afterClose = input.sample();
    input.queueSkillPress('dodge');
    const fresh = input.sample();

    return { during, afterClose, fresh };
  });

  expect(result.during.enabled).toBe(false);
  expect(result.during.input.skillPresses).toEqual([]);
  expect(result.during.input.attackHeld).toBe(false);
  expect(result.during.input.moving).toBe(false);
  expect(result.afterClose.skillPresses).toEqual([]);
  expect(result.fresh.skillPresses).toEqual(['dodge']);
});
