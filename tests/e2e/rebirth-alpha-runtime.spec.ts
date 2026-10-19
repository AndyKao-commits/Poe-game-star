import { expect, test } from '@playwright/test';

/**
 * Runtime integration test uses REAL checked-in CHAR-01 V2 and CHAR-02 V1
 * sprite exports. Both remain private review candidates, not public release art.
 */
test.describe('Rebirth private Alpha actual Phaser boot', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });


  test('boots the real scene and attaches the three mobile combat actions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#status-title')).toHaveText('資產已就緒，等待內測');
    await page.locator('#start').click();
    await expect(page.locator('#game canvas')).toBeVisible({ timeout: 15000 });
    console.log('ALPHA_BOOT_DIAGNOSTIC', await page.locator('#status-title').textContent(), await page.locator('#status-message').textContent());
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#status-panel')).toBeHidden();
    await expect(page.locator('#attack')).toBeVisible();
    await expect(page.locator('#punch')).toBeVisible();
    await expect(page.locator('#dash')).toBeVisible();
    await expect.poll(() => page.locator('#stick-base').evaluate(
      el => (el as HTMLElement).style.width,
    )).not.toBe('');
    expect(errors).toEqual([]);
  });

  test('steers the joystick with a physical-style touch sequence while attacking', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium CDP dispatchTouchEvent required');
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#start').click();
    await expect(page.locator('#stick-base')).toHaveCSS('width', /[1-9]/);
    const base = await page.locator('#stick-base').boundingBox();
    const attack = await page.locator('#attack').boundingBox();
    expect(base).toBeTruthy();
    expect(attack).toBeTruthy();
    const client = await page.context().newCDPSession(page);
    const finger = { x: Math.round(base!.x + base!.width / 2), y: Math.round(base!.y + base!.height / 2) };
    const moved = { x: finger.x + 40, y: finger.y - 10 };
    const strike = { x: Math.round(attack!.x + attack!.width / 2), y: Math.round(attack!.y + attack!.height / 2) };
    const dispatch = (type: string, points: Array<{ x: number; y: number; id: number }>) =>
      client.send('Input.dispatchTouchEvent', {
        type, touchPoints: points.map(p => ({ x: p.x, y: p.y, id: p.id })),
      });
    await dispatch('touchStart', [{ ...finger, id: 1 }]);
    await dispatch('touchMove', [{ ...moved, id: 1 }]);
    await expect.poll(() => page.locator('#stick-knob').evaluate(
      el => parseFloat((el as HTMLElement).style.left),
    )).toBeGreaterThan(finger.x + 10);
    await dispatch('touchStart', [{ ...moved, id: 1 }, { ...strike, id: 2 }]);
    await expect(page.locator('#attack')).toHaveClass(/pressed/);
    await dispatch('touchEnd', [{ ...moved, id: 1 }]);
    await expect(page.locator('#attack')).not.toHaveClass(/pressed/);
    await dispatch('touchEnd', []);
    await expect.poll(() => page.locator('#stick-knob').evaluate(
      el => parseFloat((el as HTMLElement).style.left),
    )).toBeCloseTo(finger.x, 0);
    await client.detach();
  });
});
