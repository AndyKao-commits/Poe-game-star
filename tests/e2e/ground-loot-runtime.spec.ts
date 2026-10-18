import { test, expect } from '@playwright/test';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getGroundLootForTests?: () => unknown }
      | undefined;
    return typeof scene?.getGroundLootForTests === 'function';
  });
}

test('C ground reward appears in the world and D pickup action collects exactly once', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'rare' }, pos: { x: number; y: number }) => void;
    };
    scene.spawnGroundLoot('test-drop', { itemId: 'ashen_blade', rarity: 'rare' }, scene.getPlayerForTests().position);
  });
  await expect(page.locator('[data-loot-toast]')).toContainText('掉落地面');
  await expect(page.locator('[data-pickup]')).toBeVisible();
  await page.locator('[data-pickup]').click();
  const after = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getGroundLootForTests: () => { drops: unknown[] };
      getGearKitForTests: () => { inventory: { slots: Array<{ itemId: string; rarity: string; quantity: number }> } };
    };
    return {
      drops: scene.getGroundLootForTests().drops.length,
      items: scene.getGearKitForTests().inventory.slots
        .filter((entry) => entry.itemId === 'ashen_blade' && entry.rarity === 'rare'),
    };
  });
  expect(after).toEqual({ drops: 0, items: [{ itemId: 'ashen_blade', rarity: 'rare', quantity: 1 }] });
  await expect(page.locator('[data-pickup]')).toBeHidden();
  await expect(page.locator('[data-pickup]')).toBeDisabled();
});

test('ground pickup never removes the world item while C inventory is full', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: { inventory: { capacity: number; slots: unknown[] } };
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      pickupNearestGroundLoot: () => void;
      getGroundLootForTests: () => { drops: unknown[] };
      groundLootMarkers: Map<string, { active: boolean }>;
    };
    scene.gearKit = { ...scene.gearKit, inventory: { capacity: 0, slots: [] } };
    scene.spawnGroundLoot('full-bag-drop', { itemId: 'scrap', rarity: 'common' }, scene.getPlayerForTests().position);
    scene.pickupNearestGroundLoot();
    return {
      count: scene.getGroundLootForTests().drops.length,
      markerActive: scene.groundLootMarkers.get('full-bag-drop')?.active,
      bagSlots: scene.gearKit.inventory.slots.length,
    };
  });
  expect(result).toEqual({ count: 1, markerActive: true, bagSlots: 0 });
  await expect(page.locator('[data-loot-toast]')).toContainText('物品仍留在地面');
});

test('nearby pickup control updates immediately when a drop spawns and is collected', async ({ page }) => {
  await ready(page);
  const state = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      pickupNearestGroundLoot: () => void;
    };
    const pickup = document.querySelector('[data-pickup]') as HTMLButtonElement;
    const before = { hidden: pickup.hidden, disabled: pickup.disabled };
    scene.spawnGroundLoot('immediate-drop', { itemId: 'scrap', rarity: 'common' }, scene.getPlayerForTests().position);
    const spawned = { hidden: pickup.hidden, disabled: pickup.disabled };
    scene.pickupNearestGroundLoot();
    const collected = { hidden: pickup.hidden, disabled: pickup.disabled };
    return { before, spawned, collected };
  });
  expect(state).toEqual({
    before: { hidden: true, disabled: true },
    spawned: { hidden: false, disabled: false },
    collected: { hidden: true, disabled: true },
  });
});
