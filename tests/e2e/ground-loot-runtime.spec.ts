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

test('full inventory skips a blocked nearby item to collect a farther stackable drop', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: {
        inventory: { capacity: number; slots: Array<{ itemId: string; rarity: 'common'; quantity: number }> };
      };
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      pickupNearestGroundLoot: () => void;
      getGroundLootForTests: () => { drops: Array<{ id: string }> };
      groundLootMarkers: Map<string, { active: boolean }>;
    };
    const pos = scene.getPlayerForTests().position;
    scene.gearKit = {
      ...scene.gearKit,
      inventory: { capacity: 1, slots: [{ itemId: 'scrap', rarity: 'common', quantity: 1 }] },
    };
    scene.spawnGroundLoot('blocked-nearest', { itemId: 'ashen_blade', rarity: 'common' }, { ...pos });
    scene.spawnGroundLoot('stackable-farther', { itemId: 'scrap', rarity: 'common' }, { x: pos.x + 0.5, y: pos.y });
    scene.pickupNearestGroundLoot();
    return {
      groundIds: scene.getGroundLootForTests().drops.map((drop) => drop.id),
      bag: scene.gearKit.inventory.slots,
      blockedMarkerActive: scene.groundLootMarkers.get('blocked-nearest')?.active,
      collectedMarkerGone: !scene.groundLootMarkers.has('stackable-farther'),
    };
  });
  expect(result).toEqual({
    groundIds: ['blocked-nearest'],
    bag: [{ itemId: 'scrap', rarity: 'common', quantity: 2 }],
    blockedMarkerActive: true,
    collectedMarkerGone: true,
  });
});

test('encounter restart clears all ground drop data and markers without erasing collected inventory', async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => {
        position: { x: number; y: number };
        stats: { hp: number };
        iframes: { clear: () => void };
        takeDamage: (damage: number) => void;
      };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      getGroundLootForTests: () => { drops: unknown[] };
      groundLootMarkers: Map<string, { active: boolean }>;
      restartForTests: () => void;
    };
    const player = scene.getPlayerForTests();
    scene.spawnGroundLoot('reset-one', { itemId: 'scrap', rarity: 'common' }, player.position);
    scene.spawnGroundLoot('reset-two', { itemId: 'ashen_blade', rarity: 'common' }, player.position);
    const markers = [...scene.groundLootMarkers.values()];
    player.iframes.clear();
    player.stats.hp = 1;
    player.takeDamage(999);
    scene.restartForTests();
    return {
      before: markers.length,
      after: scene.getGroundLootForTests().drops.length,
      activeMarkers: markers.filter((marker) => marker.active).length,
      sceneMarkers: scene.groundLootMarkers.size,
      pickupHidden: (document.querySelector('[data-pickup]') as HTMLButtonElement).hidden,
    };
  });
  expect(result).toEqual({
    before: 2,
    after: 0,
    activeMarkers: 0,
    sceneMarkers: 0,
    pickupHidden: true,
  });
});

test('C ground loot and D pickup visibility stay gated by range and inventory modal', async ({ page }) => {
  await ready(page);
  const states = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => {
        position: { x: number; y: number };
        entity: { position: { x: number; y: number } };
      };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      syncPickupAvailability: () => void;
      setInventoryOpen: (open: boolean) => void;
      getGroundLootForTests: () => { drops: unknown[] };
    };
    const pickup = document.querySelector('[data-pickup]') as HTMLButtonElement;
    const player = scene.getPlayerForTests();
    const origin = { ...player.position };
    const snapshot = () => ({ hidden: pickup.hidden, disabled: pickup.disabled });
    scene.spawnGroundLoot('range-modal-drop', { itemId: 'scrap', rarity: 'common' }, origin);
    const near = snapshot();
    scene.setInventoryOpen(true);
    const inventoryOpen = snapshot();
    scene.setInventoryOpen(false);
    const inventoryClosed = snapshot();
    player.entity.position = { x: origin.x + 10, y: origin.y + 10 };
    scene.syncPickupAvailability();
    const far = snapshot();
    player.entity.position = origin;
    scene.syncPickupAvailability();
    const returned = snapshot();
    return { near, inventoryOpen, inventoryClosed, far, returned, remainingDrops: scene.getGroundLootForTests().drops.length };
  });

  expect(states).toEqual({
    near: { hidden: false, disabled: false },
    inventoryOpen: { hidden: true, disabled: true },
    inventoryClosed: { hidden: false, disabled: false },
    far: { hidden: true, disabled: true },
    returned: { hidden: false, disabled: false },
    remainingDrops: 1,
  });
});
