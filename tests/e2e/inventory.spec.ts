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

test('inventory blocks player controls while enemy AI and HUD continue ticking', async ({ page }) => {
  await waitForGame(page);
  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();

  const observation = await page.evaluate(async () => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      enemies: Array<{ update: (...args: unknown[]) => void }>;
      getInputForTests: () => { isEnabled: boolean };
      getPlayerForTests: () => { stats: { hp: number; maxHp: number } };
      getInventoryOpenForTests: () => boolean;
    };
    const enemy = scene.enemies[0];
    if (!enemy) return { enemyPresent: false, ticks: 0, inputEnabled: true, open: false, hpText: '' };
    const original = enemy.update;
    let ticks = 0;
    enemy.update = (...args: unknown[]) => {
      ticks++;
      return original.apply(enemy, args);
    };
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      return {
        enemyPresent: true,
        ticks,
        inputEnabled: scene.getInputForTests().isEnabled,
        open: scene.getInventoryOpenForTests(),
        hpText: document.querySelector('[data-hp-text]')?.textContent ?? '',
      };
    } finally {
      enemy.update = original;
    }
  });
  expect(observation.enemyPresent).toBe(true);
  expect(observation.ticks).toBeGreaterThan(0);
  expect(observation.inputEnabled).toBe(false);
  expect(observation.open).toBe(true);
  expect(observation.hpText).toContain('/');

  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  expect(await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getInputForTests: () => { isEnabled: boolean };
    };
    return scene.getInputForTests().isEnabled;
  })).toBe(true);
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

test('C gear bonuses stay in sync with A skill resources and D HUD', async ({ page }) => {
  await waitForGame(page);

  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ashen_blade', 'uncommon')) throw new Error('weapon grant failed');
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.locator('[data-equip-id="ashen_blade"]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();

  const equipped = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => {
        stats: { attack: number; defense: number; hp: number; maxHp: number; mp: number };
        getSkillUiState: () => { mana: number; maxMana: number };
      };
    };
    const player = scene.getPlayerForTests();
    return { ...player.stats, skill: player.getSkillUiState() };
  });
  expect(equipped.attack).toBe(17);
  expect(equipped.defense).toBe(7);
  expect(equipped.maxHp).toBe(115);
  expect(equipped.skill.mana).toBe(equipped.mp);

  // Opening C inventory must gate A skills even if the keyboard receives input.
  await page.keyboard.down('KeyQ');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyQ');
  const blockedMp = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { mp: number } };
    };
    return scene.getPlayerForTests().stats.mp;
  });
  expect(blockedMp).toBe(equipped.mp);

  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  await expect(page.locator('[data-hp-text]')).toHaveText('100/115');
  await page.locator('#game-root canvas').click();
  await page.keyboard.down('KeyQ');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyQ');

  await expect.poll(async () => page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { mp: number } };
    };
    return scene.getPlayerForTests().stats.mp;
  })).toBe(equipped.mp - 12);

  await expect(page.locator('[data-mp-text]')).toHaveText(`${equipped.mp - 12}/${equipped.skill.maxMana}`);
});


test('inventory toggles mobile skill availability without stale disabled state', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getOrientationGateForTests: () => { setCoarsePointerForTests: (v: boolean) => void } | null;
    };
    scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
  });
  const q = page.locator('[data-skill-q]');
  await expect(q).toBeVisible();
  await expect(q).toHaveAttribute('data-skill-state', 'ready');
  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await expect(q).toHaveAttribute('data-skill-state', 'disabled');
  await expect(q).toBeDisabled();
  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  await expect(q).toHaveAttribute('data-skill-state', 'ready');
  await expect(q).toBeEnabled();
});

test('HUD attack and defense follow equipped gear in real time', async ({ page }) => {
  await waitForGame(page);
  const stats = page.locator('[data-combat-stats]');
  await expect(stats).toHaveText('ATK 12 · DEF 5');
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    scene.grantLootForTests('ashen_blade', 'uncommon');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ashen_blade"]').click();
  await expect(stats).toHaveText('ATK 17 · DEF 5');
  await page.locator('[data-inv-close]').click();
  await expect(stats).toHaveText('ATK 17 · DEF 5');
});

test('armor equip and unequip synchronize defense and HP HUD', async ({ page }) => {
  await waitForGame(page);
  const combat = page.locator('[data-combat-stats]');
  const hp = page.locator('[data-hp-text]');
  await expect(combat).toHaveText('ATK 12 · DEF 5');
  await expect(hp).toHaveText('100/100');
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 7');
  await expect(hp).toHaveText('100/115');
  await page.locator('[data-unequip="armor"]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 5');
  await expect(hp).toHaveText('100/100');
  await page.locator('[data-inv-close]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 5');
});

test('equipped gear shows localized bonus labels and clears on unequip', async ({ page }) => {
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();
  const armor = page.locator('[data-slot="armor"]');
  await expect(armor.locator('.inv-equip-bonus')).toContainText('防禦 +2');
  await expect(armor.locator('.inv-equip-bonus')).toContainText('生命上限 +15');
  await armor.locator('[data-unequip="armor"]').click();
  await expect(armor.locator('.inv-equip-bonus')).toHaveCount(0);
});

test('landscape inventory keeps close and equipment actions touch accessible', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  const panel = page.locator('[data-inventory-panel]');
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(844);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
  const close = page.locator('[data-inv-close]');
  const equip = page.locator('[data-equip-id="ruin_mail"]');
  await expect(close).toBeVisible();
  await expect(equip).toBeVisible();
  const closeBox = await close.boundingBox();
  const equipBox = await equip.boundingBox();
  expect(closeBox!.height).toBeGreaterThanOrEqual(36);
  expect(equipBox!.height).toBeGreaterThanOrEqual(36);
  await equip.click();
  await expect(page.locator('[data-slot="armor"] .inv-equip-bonus')).toContainText('防禦 +2');
  await close.click();
  await expect(panel).toBeHidden();
});
));

  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  expect(await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getInputForTests: () => { isEnabled: boolean };
    };
    return scene.getInputForTests().isEnabled;
  })).toBe(true);
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

test('C gear bonuses stay in sync with A skill resources and D HUD', async ({ page }) => {
  await waitForGame(page);

  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ashen_blade', 'uncommon')) throw new Error('weapon grant failed');
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await page.locator('[data-equip-id="ashen_blade"]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();

  const equipped = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => {
        stats: { attack: number; defense: number; hp: number; maxHp: number; mp: number };
        getSkillUiState: () => { mana: number; maxMana: number };
      };
    };
    const player = scene.getPlayerForTests();
    return { ...player.stats, skill: player.getSkillUiState() };
  });
  expect(equipped.attack).toBe(17);
  expect(equipped.defense).toBe(7);
  expect(equipped.maxHp).toBe(115);
  expect(equipped.skill.mana).toBe(equipped.mp);

  // Opening C inventory must gate A skills even if the keyboard receives input.
  await page.keyboard.down('KeyQ');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyQ');
  const blockedMp = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { mp: number } };
    };
    return scene.getPlayerForTests().stats.mp;
  });
  expect(blockedMp).toBe(equipped.mp);

  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  await expect(page.locator('[data-hp-text]')).toHaveText('100/115');
  await page.locator('#game-root canvas').click();
  await page.keyboard.down('KeyQ');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyQ');

  await expect.poll(async () => page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getPlayerForTests: () => { stats: { mp: number } };
    };
    return scene.getPlayerForTests().stats.mp;
  })).toBe(equipped.mp - 12);

  await expect(page.locator('[data-mp-text]')).toHaveText(`${equipped.mp - 12}/${equipped.skill.maxMana}`);
});


test('inventory toggles mobile skill availability without stale disabled state', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      getOrientationGateForTests: () => { setCoarsePointerForTests: (v: boolean) => void } | null;
    };
    scene.getOrientationGateForTests()?.setCoarsePointerForTests(true);
  });
  const q = page.locator('[data-skill-q]');
  await expect(q).toBeVisible();
  await expect(q).toHaveAttribute('data-skill-state', 'ready');
  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();
  await expect(q).toHaveAttribute('data-skill-state', 'disabled');
  await expect(q).toBeDisabled();
  await page.locator('[data-inv-close]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeHidden();
  await expect(q).toHaveAttribute('data-skill-state', 'ready');
  await expect(q).toBeEnabled();
});

test('HUD attack and defense follow equipped gear in real time', async ({ page }) => {
  await waitForGame(page);
  const stats = page.locator('[data-combat-stats]');
  await expect(stats).toHaveText('ATK 12 · DEF 5');
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    scene.grantLootForTests('ashen_blade', 'uncommon');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ashen_blade"]').click();
  await expect(stats).toHaveText('ATK 17 · DEF 5');
  await page.locator('[data-inv-close]').click();
  await expect(stats).toHaveText('ATK 17 · DEF 5');
});

test('armor equip and unequip synchronize defense and HP HUD', async ({ page }) => {
  await waitForGame(page);
  const combat = page.locator('[data-combat-stats]');
  const hp = page.locator('[data-hp-text]');
  await expect(combat).toHaveText('ATK 12 · DEF 5');
  await expect(hp).toHaveText('100/100');
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 7');
  await expect(hp).toHaveText('100/115');
  await page.locator('[data-unequip="armor"]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 5');
  await expect(hp).toHaveText('100/100');
  await page.locator('[data-inv-close]').click();
  await expect(combat).toHaveText('ATK 12 · DEF 5');
});

test('equipped gear shows localized bonus labels and clears on unequip', async ({ page }) => {
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ruin_mail"]').click();
  const armor = page.locator('[data-slot="armor"]');
  await expect(armor.locator('.inv-equip-bonus')).toContainText('防禦 +2');
  await expect(armor.locator('.inv-equip-bonus')).toContainText('生命上限 +15');
  await armor.locator('[data-unequip="armor"]').click();
  await expect(armor.locator('.inv-equip-bonus')).toHaveCount(0);
});

test('landscape inventory keeps close and equipment actions touch accessible', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForGame(page);
  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as {
      grantLootForTests: (itemId: string, rarity: string) => boolean;
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('armor grant failed');
  });
  await page.locator('[data-inventory]').click();
  const panel = page.locator('[data-inventory-panel]');
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(844);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
  const close = page.locator('[data-inv-close]');
  const equip = page.locator('[data-equip-id="ruin_mail"]');
  await expect(close).toBeVisible();
  await expect(equip).toBeVisible();
  const closeBox = await close.boundingBox();
  const equipBox = await equip.boundingBox();
  expect(closeBox!.height).toBeGreaterThanOrEqual(36);
  expect(equipBox!.height).toBeGreaterThanOrEqual(36);
  await equip.click();
  await expect(page.locator('[data-slot="armor"] .inv-equip-bonus')).toContainText('防禦 +2');
  await close.click();
  await expect(panel).toBeHidden();
});
