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

test('full bag preserves a nearby drop for a later successful UI pickup', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: { inventory: { capacity: number; slots: unknown[] } };
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
    };
    scene.gearKit = { ...scene.gearKit, inventory: { capacity: 0, slots: [] } };
    scene.spawnGroundLoot('retry-after-space', { itemId: 'scrap', rarity: 'common' }, scene.getPlayerForTests().position);
  });

  const pickup = page.locator('[data-pickup]');
  await expect(pickup).toBeVisible();
  await pickup.click();
  await expect(page.locator('[data-loot-toast]')).toContainText('物品仍留在地面');
  await expect(pickup).toBeEnabled();

  const blocked = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getGroundLootForTests: () => { drops: unknown[] };
      getGearKitForTests: () => { inventory: { slots: unknown[] } };
    };
    return { drops: scene.getGroundLootForTests().drops.length, slots: scene.getGearKitForTests().inventory.slots.length };
  });
  expect(blocked).toEqual({ drops: 1, slots: 0 });

  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: { inventory: { capacity: number; slots: unknown[] } };
    };
    scene.gearKit = { ...scene.gearKit, inventory: { ...scene.gearKit.inventory, capacity: 1 } };
  });

  await pickup.click();
  await expect(pickup).toBeHidden();
  const collected = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getGroundLootForTests: () => { drops: unknown[] };
      getGearKitForTests: () => { inventory: { slots: Array<{ itemId: string; rarity: string; quantity: number }> } };
    };
    return { drops: scene.getGroundLootForTests().drops.length, slots: scene.getGearKitForTests().inventory.slots };
  });
  expect(collected).toEqual({ drops: 0, slots: [{ itemId: 'scrap', rarity: 'common', quantity: 1 }] });
});

test('overflow ground rewards remain queued, promote on pickup, and are all collectible', async ({ page }) => {
  await ready(page);
  const state = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: { inventory: { capacity: number; slots: unknown[] } };
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      pickupNearestGroundLoot: () => void;
      getGroundLootForTests: () => { drops: Array<{ id: string }> };
      getPendingGroundLootCountForTests: () => number;
      groundLootMarkers: Map<string, { active: boolean }>;
      getGearKitForTests: () => { inventory: { slots: Array<{ itemId: string; quantity: number }> } };
    };
    const position = scene.getPlayerForTests().position;
    scene.gearKit = { ...scene.gearKit, inventory: { capacity: 1, slots: [] } };
    for (let i = 0; i < 33; i++) {
      scene.spawnGroundLoot('overflow-' + i, { itemId: 'scrap', rarity: 'common' }, position);
    }
    const initial = {
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
      pending: scene.getPendingGroundLootCountForTests(),
    };
    scene.pickupNearestGroundLoot();
    const promoted = {
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
      pending: scene.getPendingGroundLootCountForTests(),
      promotedIdVisible: scene.groundLootMarkers.has('overflow-32'),
    };
    for (let i = 0; i < 32; i++) scene.pickupNearestGroundLoot();
    const final = {
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
      pending: scene.getPendingGroundLootCountForTests(),
      scrapQuantity: scene.getGearKitForTests().inventory.slots.find((item) => item.itemId === 'scrap')?.quantity,
    };
    return { initial, promoted, final };
  });
  expect(state).toEqual({
    initial: { physical: 32, markers: 32, pending: 1 },
    promoted: { physical: 32, markers: 32, pending: 0, promotedIdVisible: true },
    final: { physical: 0, markers: 0, pending: 0, scrapQuantity: 33 },
  });
});

test('encounter reset clears pending overflow as well as physical drops', async ({ page }) => {
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
      getPendingGroundLootCountForTests: () => number;
      groundLootMarkers: Map<string, unknown>;
      restartForTests: () => void;
    };
    const player = scene.getPlayerForTests();
    for (let i = 0; i < 33; i++) {
      scene.spawnGroundLoot('reset-overflow-' + i, { itemId: 'scrap', rarity: 'common' }, player.position);
    }
    const before = scene.getPendingGroundLootCountForTests();
    player.iframes.clear();
    player.stats.hp = 1;
    player.takeDamage(999);
    scene.restartForTests();
    return {
      before,
      pending: scene.getPendingGroundLootCountForTests(),
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
    };
  });
  expect(result).toEqual({ before: 1, pending: 0, physical: 0, markers: 0 });
});

test('multiple queued overflow rewards promote in FIFO order without losing inventory items', async ({ page }) => {
  await ready(page);
  const state = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      gearKit: { inventory: { capacity: number; slots: unknown[] } };
      getPlayerForTests: () => { position: { x: number; y: number } };
      spawnGroundLoot: (id: string, loot: { itemId: string; rarity: 'common' }, pos: { x: number; y: number }) => void;
      pickupNearestGroundLoot: () => void;
      getGroundLootForTests: () => { drops: Array<{ id: string }> };
      getPendingGroundLootCountForTests: () => number;
      groundLootMarkers: Map<string, { active: boolean }>;
      getGearKitForTests: () => { inventory: { slots: Array<{ itemId: string; quantity: number }> } };
    };
    const position = scene.getPlayerForTests().position;
    scene.gearKit = { ...scene.gearKit, inventory: { capacity: 1, slots: [] } };
    for (let i = 0; i < 35; i++) {
      scene.spawnGroundLoot('fifo-' + i, { itemId: 'scrap', rarity: 'common' }, position);
    }
    const snapshot = () => ({
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
      pending: scene.getPendingGroundLootCountForTests(),
      queuedVisible: [32, 33, 34].map((i) => scene.groundLootMarkers.has('fifo-' + i)),
    });
    const initial = snapshot();
    scene.pickupNearestGroundLoot();
    const afterFirst = snapshot();
    scene.pickupNearestGroundLoot();
    const afterSecond = snapshot();
    scene.pickupNearestGroundLoot();
    const afterThird = snapshot();
    for (let i = 0; i < 32; i++) scene.pickupNearestGroundLoot();
    const final = {
      physical: scene.getGroundLootForTests().drops.length,
      markers: scene.groundLootMarkers.size,
      pending: scene.getPendingGroundLootCountForTests(),
      scrapQuantity: scene.getGearKitForTests().inventory.slots.find((item) => item.itemId === 'scrap')?.quantity,
    };
    return { initial, afterFirst, afterSecond, afterThird, final };
  });
  expect(state).toEqual({
    initial: { physical: 32, markers: 32, pending: 3, queuedVisible: [false, false, false] },
    afterFirst: { physical: 32, markers: 32, pending: 2, queuedVisible: [true, false, false] },
    afterSecond: { physical: 32, markers: 32, pending: 1, queuedVisible: [true, true, false] },
    afterThird: { physical: 32, markers: 32, pending: 0, queuedVisible: [true, true, true] },
    final: { physical: 0, markers: 0, pending: 0, scrapQuantity: 35 },
  });
});
