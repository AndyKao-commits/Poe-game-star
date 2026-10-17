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

test('inventory modal blocks attack input and restores after close', async ({ page }) => {
  await waitForGame(page);

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();

  const whileOpen = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getInventoryOpenForTests: () => boolean;
      getInputForTests: () => {
        isEnabled: boolean;
        sample: () => { attackHeld: boolean; moving: boolean };
      };
    };
    return {
      open: scene.getInventoryOpenForTests(),
      enabled: scene.getInputForTests().isEnabled,
      sample: scene.getInputForTests().sample(),
    };
  });
  expect(whileOpen.open).toBe(true);
  expect(whileOpen.enabled).toBe(false);
  expect(whileOpen.sample.attackHeld).toBe(false);
  expect(whileOpen.sample.moving).toBe(false);

  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();

  const afterClose = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getInventoryOpenForTests: () => boolean;
      getInputForTests: () => { isEnabled: boolean };
    };
    return {
      open: scene.getInventoryOpenForTests(),
      enabled: scene.getInputForTests().isEnabled,
    };
  });
  expect(afterClose.open).toBe(false);
  expect(afterClose.enabled).toBe(true);
});

test('held desktop mouse attack requires release after inventory closes', async ({ page }) => {
  await waitForGame(page);
  const canvas = page.locator('#game-root canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).toBeTruthy();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.locator('[data-inv-close]').dispatchEvent('click');
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();

  const attackHeld = async () => page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getInputForTests: () => { sample: () => { attackHeld: boolean } };
    };
    return scene.getInputForTests().sample().attackHeld;
  });
  expect(await attackHeld()).toBe(false);
  await page.mouse.up();
  expect(await attackHeld()).toBe(false);
  await page.mouse.down();
  expect(await attackHeld()).toBe(true);
  await page.mouse.up();
});

test('equip updates combat stats and survives death respawn', async ({ page }) => {
  await waitForGame(page);

  const before = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
      getPlayerForTests: () => { stats: { attack: number; maxHp: number; hp: number } };
      getGearKitForTests: () => {
        inventory: { slots: unknown[] };
        equipment: { weapon?: { id: string } };
      };
    };
    const ok = scene.grantLootForTests('ashen_blade', 'uncommon');
    return {
      ok,
      attack: scene.getPlayerForTests().stats.attack,
      slots: scene.getGearKitForTests().inventory.slots.length,
    };
  });
  expect(before.ok).toBe(true);
  expect(before.attack).toBe(12);
  expect(before.slots).toBe(1);

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.locator('[data-equip-id="ashen_blade"]').click();

  const equipped = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { attack: number } };
      getGearKitForTests: () => {
        inventory: { slots: unknown[] };
        equipment: { weapon?: { id: string; bonuses: { attack?: number } } };
      };
    };
    return {
      attack: scene.getPlayerForTests().stats.attack,
      weaponAttack: scene.getGearKitForTests().equipment.weapon?.bonuses.attack,
      bagSlots: scene.getGearKitForTests().inventory.slots.length,
    };
  });
  expect(equipped.weaponAttack).toBe(5);
  expect(equipped.attack).toBe(17);
  expect(equipped.bagSlots).toBe(0);

  await page.locator('[data-inv-close]').click();

  // Death → restart must keep equipment and derived attack.
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
  await expect(page.locator('[data-death]')).toBeVisible();
  await page.locator('[data-restart]').click();
  await expect(page.locator('[data-death]')).toBeHidden();

  const afterRespawn = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getPlayerForTests: () => {
        stats: { attack: number; hp: number; maxHp: number };
        lifecycle: { isDead: boolean };
      };
      getGearKitForTests: () => {
        equipment: { weapon?: { id: string } };
      };
    };
    const player = scene.getPlayerForTests();
    return {
      attack: player.stats.attack,
      hp: player.stats.hp,
      maxHp: player.stats.maxHp,
      dead: player.lifecycle.isDead,
      hasWeapon: Boolean(scene.getGearKitForTests().equipment.weapon),
    };
  });
  expect(afterRespawn.dead).toBe(false);
  expect(afterRespawn.hasWeapon).toBe(true);
  expect(afterRespawn.attack).toBe(17);
  expect(afterRespawn.hp).toBe(afterRespawn.maxHp);
});

test('inventory works in landscape mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForGame(page);

  await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
      getOrientationGateForTests: () => {
        setCoarsePointerForTests: (v: boolean) => void;
      } | null;
    };
    scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
    scene.grantLootForTests('ruin_mail', 'common');
  });

  await page.locator('[data-inventory]').click();
  const panel = page.locator('[data-inventory-panel]');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(120);

  await page.locator('[data-equip-id="ruin_mail"]').click();
  const defense = await page.evaluate(() => {
    const game = window.__ASHEN_GAME__;
    const scene = game?.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { defense: number; maxHp: number } };
    };
    return scene.getPlayerForTests().stats;
  });
  expect(defense.defense).toBe(7);
  expect(defense.maxHp).toBe(115);
});
