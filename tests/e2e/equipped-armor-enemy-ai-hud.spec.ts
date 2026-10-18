import { test, expect } from '@playwright/test';

/**
 * C armor -> B real aggressive-melee windup/strike -> D HP/DEF HUD,
 * while A's caster mana remains unchanged by the equipment transition.
 * The attack is amplified only in this test fixture so the mitigation
 * difference is observable after integer rounding.
 */
test('C armor mitigates B AI strike and D HUD tracks damage and unequip without changing A mana', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown; getEnemyCountForTests?: () => number }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.() && scene?.getEnemyCountForTests?.());
  });

  const result = await page.evaluate(() => {
    type Position = { x: number; y: number };
    type Player = {
      position: Position;
      stats: { hp: number; maxHp: number; mp: number; maxMp: number; defense: number };
      iframes: { clear: () => void };
      getCasterState: () => { resources: { mana: number; maxMana: number } };
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
      combatPhase: string;
      update: (deltaMs: number, target: Player) => void;
    };
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      enemies: Enemy[];
      grantLootForTests: (id: string, rarity: 'rare') => boolean;
      handleEquip: (id: string, rarity: 'rare') => void;
      handleUnequip: (slot: 'armor') => void;
      getPlayerForTests: () => Player;
      update: (time: number, delta: number) => void;
    };
    const player = scene.getPlayerForTests();
    const enemy = scene.enemies.find((candidate) => candidate.alive && candidate.encounter.role === 'corrupted_crawler');
    if (!enemy) throw new Error('Expected a live B aggressive crawler');
    if (!scene.grantLootForTests('ruin_mail', 'rare')) throw new Error('Failed to grant C armor');

    const originalPosition = { ...enemy.entity.position };
    const originalAttack = enemy.stats.attack;
    const originalReceive = player.receiveAttack;
    const receivedAttacks: number[] = [];
    enemy.stats.attack = 60;
    enemy.entity.position = { x: player.position.x + 0.5, y: player.position.y };
    enemy.entity.syncTransform();
    player.receiveAttack = (attack, attacker) => {
      receivedAttacks.push(attack);
      return originalReceive.call(player, attack, attacker);
    };

    const strike = () => {
      player.iframes.clear();
      player.stats.hp = 100;
      enemy.brain.reset();
      const before = player.stats.hp;
      enemy.update(16, player);
      const windup = enemy.combatPhase;
      enemy.update(400, player);
      // Advance normal scene presentation once so D HUD reads live B damage.
      scene.update(0, 16);
      return {
        windup,
        damage: before - player.stats.hp,
        hp: player.stats.hp,
        maxHp: player.stats.maxHp,
        defense: player.stats.defense,
        hpHud: document.querySelector('[data-hp-text]')?.textContent,
        defenseHud: document.querySelector('[data-combat-stats]')?.textContent,
        mana: player.getCasterState().resources.mana,
        maxMana: player.getCasterState().resources.maxMana,
        mpHud: document.querySelector('[data-mp-text]')?.textContent,
      };
    };

    try {
      const naked = strike();
      scene.handleEquip('ruin_mail', 'rare');
      const armored = strike();
      scene.handleUnequip('armor');
      const afterUnequip = {
        hp: player.stats.hp,
        maxHp: player.stats.maxHp,
        defense: player.stats.defense,
        hpHud: document.querySelector('[data-hp-text]')?.textContent,
        defenseHud: document.querySelector('[data-combat-stats]')?.textContent,
      };
      return { naked, armored, afterUnequip, receivedAttacks };
    } finally {
      player.receiveAttack = originalReceive;
      enemy.stats.attack = originalAttack;
      enemy.entity.position = originalPosition;
      enemy.entity.syncTransform();
    }
  });

  expect(result.naked).toMatchObject({
    windup: 'windup',
    damage: 57,
    hp: 43,
    maxHp: 100,
    defense: 5,
    hpHud: '43/100',
    defenseHud: 'ATK 12 · DEF 5',
    mana: 50,
    maxMana: 50,
    mpHud: '50/50',
  });
  expect(result.armored).toMatchObject({
    windup: 'windup',
    damage: 54,
    hp: 46,
    maxHp: 140,
    defense: 10,
    hpHud: '46/140',
    defenseHud: 'ATK 12 · DEF 10',
    mana: 50,
    maxMana: 50,
    mpHud: '50/50',
  });
  expect(result.afterUnequip).toEqual({
    hp: 46,
    maxHp: 100,
    defense: 5,
    hpHud: '46/100',
    defenseHud: 'ATK 12 · DEF 5',
  });
  expect(result.receivedAttacks).toEqual([60, 60]);
});
