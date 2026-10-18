import { test, expect } from '@playwright/test';

/**
 * Cross-owner regression: C inventory equip -> A Q cast -> real B enemy
 * damage receiver -> D HUD. The enemy is moved into melee range for a
 * deterministic cone hit; its actual damage/mitigation code still runs.
 */
test('equipped Q skill hits a real enemy with the derived weapon attack', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { getPlayerForTests?: () => unknown; getEnemyCountForTests?: () => number }
      | undefined;
    return Boolean(scene?.getPlayerForTests?.() && scene?.getEnemyCountForTests?.());
  });

  await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      grantLootForTests: (itemId: string, rarity: 'uncommon') => boolean;
    };
    if (!scene.grantLootForTests('ashen_blade', 'uncommon')) {
      throw new Error('C inventory could not grant test weapon');
    }
  });

  await page.locator('[data-inventory]').click();
  await page.locator('[data-equip-id="ashen_blade"]').click();
  await expect(page.locator('[data-combat-stats]')).toHaveText('ATK 17 · DEF 5');
  await page.locator('[data-inv-close]').click();

  const observed = await page.evaluate(() => {
    type Hit = { amount: number; isCrit: boolean; killed: boolean };
    type Enemy = {
      alive: boolean;
      position: { x: number; y: number };
      stats: { hp: number };
      entity: { position: { x: number; y: number }; syncTransform: () => void };
      takeDamage: (attack: number, meta?: { attackerPos: { x: number; y: number } }) => Hit;
    };
    type Player = {
      position: { x: number; y: number };
      stats: { attack: number; mp: number };
      getCasterState: () => { cooldowns: { q: number }; resources: { mana: number } };
      trySkill: (id: 'q', enemies: Enemy[], touchActive: boolean) => void;
    };
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      getPlayerForTests: () => Player;
      enemies: Enemy[];
    };
    const player = scene.getPlayerForTests();
    const enemy = scene.enemies.find((candidate) => candidate.alive);
    if (!enemy) throw new Error('No living B enemy available');

    const originalPosition = { ...enemy.entity.position };
    const originalTakeDamage = enemy.takeDamage;
    let attackReceived: number | null = null;
    let hit: Hit | null = null;
    const beforeHp = enemy.stats.hp;
    const beforeMp = player.stats.mp;
    const equippedAttack = player.stats.attack;

    // Auto-aim is used on mobile; the real enemy and damage pipeline remain intact.
    enemy.entity.position = { x: player.position.x + 0.65, y: player.position.y };
    enemy.entity.syncTransform();
    enemy.takeDamage = (attack, meta) => {
      attackReceived = attack;
      hit = originalTakeDamage.call(enemy, attack, meta);
      return hit;
    };
    try {
      player.trySkill('q', [enemy], true);
    } finally {
      enemy.takeDamage = originalTakeDamage;
      enemy.entity.position = originalPosition;
      enemy.entity.syncTransform();
    }
    return {
      equippedAttack,
      attackReceived,
      hit,
      beforeHp,
      afterHp: enemy.stats.hp,
      beforeMp,
      afterMp: player.stats.mp,
      caster: player.getCasterState(),
    };
  });

  expect(observed.equippedAttack).toBe(17);
  expect(observed.attackReceived).toBeCloseTo(observed.equippedAttack * 1.6, 5);
  expect(observed.hit).not.toBeNull();
  expect(observed.hit!.amount).toBeGreaterThan(0);
  expect(observed.afterHp).toBe(observed.beforeHp - observed.hit!.amount);
  expect(observed.afterMp).toBe(observed.beforeMp - 12);
  expect(observed.caster.resources.mana).toBe(observed.afterMp);
  expect(observed.caster.cooldowns.q).toBeGreaterThan(0);
  await expect(page.locator('[data-mp-text]')).toContainText(String(observed.afterMp));
});
