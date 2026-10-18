import { test, expect } from '@playwright/test';

test('C gear actions refresh D HUD and A resource state before the next game frame', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-root canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const scene = window.__ASHEN_GAME__?.scene?.getScene?.('GameScene') as
      | { grantLootForTests?: (itemId: string, rarity: string) => boolean }
      | undefined;
    return typeof scene?.grantLootForTests === 'function';
  });
  const result = await page.evaluate(() => {
    const scene = window.__ASHEN_GAME__!.scene.getScene('GameScene') as unknown as {
      grantLootForTests: (itemId: string, rarity: 'common') => boolean;
      handleEquip: (itemId: string, rarity: 'common') => void;
      handleUnequip: (slot: 'armor') => void;
      getPlayerForTests: () => {
        stats: { defense: number; maxHp: number };
        getSkillUiState: () => { mana: number; maxMana: number };
      };
    };
    if (!scene.grantLootForTests('ruin_mail', 'common')) throw new Error('Failed to grant armor');
    scene.handleEquip('ruin_mail', 'common');
    const equipHud = document.querySelector('[data-combat-stats]')?.textContent;
    const equipHp = document.querySelector('[data-hp-text]')?.textContent;
    const equipPlayer = scene.getPlayerForTests();
    const equipStats = { defense: equipPlayer.stats.defense, hpCap: equipPlayer.stats.maxHp };
    scene.handleUnequip('armor');
    const unequipHud = document.querySelector('[data-combat-stats]')?.textContent;
    const unequipHp = document.querySelector('[data-hp-text]')?.textContent;
    return { equipHud, equipHp, equipStats, unequipHud, unequipHp };
  });
  expect(result).toEqual({
    equipHud: 'ATK 12 · DEF 7',
    equipHp: '100/115',
    equipStats: { defense: 7, hpCap: 115 },
    unequipHud: 'ATK 12 · DEF 5',
    unequipHp: '100/100',
  });
});
