import { test, expect } from '@playwright/test';

/**
 * Chromium CDP exercises genuine touch event dispatch rather than page.mouse.
 * This does NOT substitute for physical iOS Safari testing.
 */
test.describe('Rebirth touch gesture regression', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test('touch down, drag, release moves avatar; action tap works independently', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP touch input only available in Chromium');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/rebirth-input-lab.html');
    await expect(page.locator('#status')).toContainText('移動:0.00');
    const base = await page.locator('#stick-base').boundingBox();
    expect(base).not.toBeNull();
    const x = base!.x + base!.width / 2;
    const y = base!.y + base!.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + 42, y, id: 1 }],
    });
    await expect.poll(async () => page.locator('#status').textContent()).not.toContain('移動:0.00');
    const avatarStart = await page.locator('#avatar').boundingBox();
    await page.waitForTimeout(160);
    const avatarEnd = await page.locator('#avatar').boundingBox();
    expect(avatarEnd!.x).toBeGreaterThan(avatarStart!.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#status')).toContainText('移動:0.00');
    await page.locator('#attack').tap();
    await expect(page.locator('#status')).toContainText('攻擊:1');
    expect(errors).toEqual([]);
  });
});
