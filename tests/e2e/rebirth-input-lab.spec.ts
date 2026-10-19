import { test, expect } from '@playwright/test';

test.describe('Rebirth input lab (separate from release gate)', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test('renders joystick and action controls fully inside landscape viewport', async ({ page }) => {
    await page.goto('/rebirth-input-lab.html');
    await expect(page.locator('#mode')).toHaveText('固定搖桿');
    for (const selector of ['#stick-base', '#attack', '#skill1', '#skill2']) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect, selector).not.toBeNull();
      expect(rect!.x, selector).toBeGreaterThanOrEqual(0);
      expect(rect!.y, selector).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width, selector).toBeLessThanOrEqual(844);
      expect(rect!.y + rect!.height, selector).toBeLessThanOrEqual(390);
    }
    await expect(page.locator('#portrait')).toBeHidden();
  });

  test('keeps base fixed during pointer movement and stops after release', async ({ page }) => {
    await page.goto('/rebirth-input-lab.html');
    const before = await page.locator('#stick-base').boundingBox();
    const base = before!;
    const x = base.x + base.width / 2;
    const y = base.y + base.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 50, y, { steps: 5 });
    await expect.poll(async () => (await page.locator('#status').textContent()) ?? '').toContain('移動:');
    const during = await page.locator('#status').textContent();
    expect(during).not.toContain('移動:0.00');
    expect(await page.locator('#stick-base').boundingBox()).toEqual(before);
    await page.mouse.up();
    await expect(page.locator('#status')).toContainText('移動:0.00');
  });

  test('action buttons register taps and floating mode is opt-in', async ({ page }) => {
    await page.goto('/rebirth-input-lab.html');
    await page.locator('#attack').tap({ force: true });
    await expect(page.locator('#status')).toContainText('攻擊:1');
    await page.locator('#mode').click();
    await expect(page.locator('#mode')).toHaveText('浮動搖桿');
  });
});
