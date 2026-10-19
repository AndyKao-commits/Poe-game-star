import { test, expect } from '@playwright/test';

/**
 * Cross-owner lifecycle regression:
 * C armor/accessory -> A cast -> C inventory modal -> B real AI lethal strike
 * -> D death HUD -> restart with preserved gear and reset A cooldown/resources.
 *
 * This exercises the existing legacy behavior: enemies continue attacking while
 * the inventory blocks player input. It does not change Rebirth's future pause spec.
 */
test('equipped player killed by B AI with C inventory open respawns with synchronized A/D state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown; getEnemyCountForTests?: () => number }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.() && scene?.getEnemyCountForTests?.());
  });

  const before = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      grantLootForTests: (id: string, rarity: 'rare') => boolean;
      handleEquip: (id: string, rarity: 'rare') => void;
      getPlayerForTests: () => {
        stats: { hp: number; maxHp: number; mp: number; maxMp: number; defense: number };
        getCasterState: () => { cooldowns: { q: number }; resources: { mana: number; maxMana: number } };
        trySkill: (id: 'q', enemies: [], touchActive: boolean) => void;
      };
    };
    if (!scene.grantLootForTests('ruin_mail', 'rare')) throw new Error('Could not grant armor');
    if (!scene.grantLootForTests('ember_charm', 'rare')) throw new Error('Could not grant charm');
    scene.handleEquip('ruin_mail', 'rare');
    scene.handleEquip('ember_charm', 'rare');
    const player = scene.getPlayerForTests();
    player.trySkill('q', [], true);
    return {
      maxHp: player.stats.maxHp,
      maxMp: player.stats.maxMp,
      defense: player.stats.defense,
      mp: player.stats.mp,
      cooldown: player.getCasterState().cooldowns.q,
      hud: document.querySelector('[data-combat-stats]')?.textContent,
    };
  });
  expect(before).toMatchObject({
    maxHp: 140,
    maxMp: 65,
    defense: 10,
    mp: 38,
    hud: 'ATK 12 · DEF 10',
  });
  expect(before.cooldown).toBeGreaterThan(0);

  await page.locator('[data-inventory]').click();
  await expect(page.locator('[data-inventory-panel]')).toBeVisible();

  const death = await page.evaluate(() => {
    type Position = { x: number; y: number };
    type Player = {
      position: Position;
      stats: { hp: number; maxHp: number; mp: number; maxMp: number; defense: number };
      lifecycle: { isDead: boolean };
      iframes: { clear: () => void };
      getCasterState: () => { dead: boolean; cooldowns: { q: number } };
      receiveAttack: (attack: number, attacker: Position) => {
        accepted: boolean; died: boolean; amount: number; isCrit: boolean;
      };
    };
    type Enemy = {
      alive: boolean;
      encounter: { role: string };
      stats: { attack: number };
      entity: { position: Position; syncTransform: () => void };
      brain: { reset: () => void };
      update: (deltaMs: number, target: Player) => void;
    };
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      enemies: Enemy[];
      getPlayerForTests: () => Player;
      getInventoryOpenForTests: () => boolean;
      getInputForTests: () => { isEnabled: boolean };
      update: (time: number, delta: number) => void;
    };
    const player = scene.getPlayerForTests();
    const enemy = scene.enemies.find((candidate) => candidate.alive && candidate.encounter.role === 'corrupted_crawler');
    if (!enemy) throw new Error('Expected a living crawler for B AI lethal strike');
    const originalAttack = enemy.stats.attack;
    const originalPosition = { ...enemy.entity.position };
    try {
      player.iframes.clear();
      player.stats.hp = 1;
      enemy.stats.attack = 1000;
      enemy.entity.position = { x: player.position.x + 0.5, y: player.position.y };
      enemy.entity.syncTransform();
      enemy.brain.reset();
      enemy.update(16, player);
      enemy.update(400, player);
      scene.update(0, 16);
      return {
        dead: player.lifecycle.isDead,
        hp: player.stats.hp,
        casterDead: player.getCasterState().dead,
        inventoryOpen: scene.getInventoryOpenForTests(),
        inputEnabled: scene.getInputForTests().isEnabled,
        deathVisible: !document.querySelector<HTMLElement>('[data-death]')?.hidden,
        inventoryHidden: document.querySelector<HTMLElement>('[data-inventory-panel]')?.closest('[aria-hidden]')?.getAttribute('aria-hidden'),
        hudHp: document.querySelector('[data-hp-text]')?.textContent,
      };
    } finally {
      enemy.stats.attack = originalAttack;
      enemy.entity.position = originalPosition;
      enemy.entity.syncTransform();
    }
  });
  expect(death).toMatchObject({
    dead: true,
    hp: 0,
    casterDead: true,
    inventoryOpen: false,
    inputEnabled: false,
    deathVisible: true,
    inventoryHidden: 'true',
    hudHp: '0/140',
  });
  await expect(page.locator('[data-death]')).toBeVisible();
  await page.locator('[data-restart]').click();
  await expect(page.locator('[data-death]')).toBeHidden();

  const restored = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => {
        stats: { hp: number; maxHp: number; mp: number; maxMp: number; defense: number };
        lifecycle: { isDead: boolean };
        getCasterState: () => {
          dead: boolean;
          cooldowns: { q: number };
          resources: { mana: number; maxMana: number };
        };
      };
      getInventoryOpenForTests: () => boolean;
      getInputForTests: () => { isEnabled: boolean };
    };
    const player = scene.getPlayerForTests();
    const caster = player.getCasterState();
    return {
      dead: player.lifecycle.isDead,
      inventoryOpen: scene.getInventoryOpenForTests(),
      inputEnabled: scene.getInputForTests().isEnabled,
      hp: player.stats.hp,
      maxHp: player.stats.maxHp,
      mp: player.stats.mp,
      maxMp: player.stats.maxMp,
      defense: player.stats.defense,
      casterDead: caster.dead,
      mana: caster.resources.mana,
      maxMana: caster.resources.maxMana,
      qCooldown: caster.cooldowns.q,
      hudHp: document.querySelector('[data-hp-text]')?.textContent,
      hudMp: document.querySelector('[data-mp-text]')?.textContent,
      hudStats: document.querySelector('[data-combat-stats]')?.textContent,
    };
  });
  expect(restored).toEqual({
    dead: false,
    inventoryOpen: false,
    inputEnabled: true,
    hp: 140,
    maxHp: 140,
    mp: 65,
    maxMp: 65,
    defense: 10,
    casterDead: false,
    mana: 65,
    maxMana: 65,
    qCooldown: 0,
    hudHp: '140/140',
    hudMp: '65/65',
    hudStats: 'ATK 12 · DEF 10',
  });
});
