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
    await expect(page.locator('#restart-run')).toBeVisible();
    await expect.poll(() => page.locator('#stick-base').evaluate(
      el => (el as HTMLElement).style.width,
    )).not.toBe('');
    expect(errors).toEqual([]);
  });

  test('replays the real Phaser scene without losing mobile controls', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#restart-run')).toBeHidden();
    await page.locator('#start').click();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#restart-run')).toBeVisible();
    await expect(page.locator('#stick-base')).toHaveCSS('width', /[1-9]/);
    await page.locator('#restart-run').click();
    await expect(page.locator('#game canvas')).toBeVisible();
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#attack')).toBeVisible();
    await expect(page.locator('#stick-base')).toHaveCSS('width', /[1-9]/);
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
    await page.evaluate(() => {
      const events: string[] = [];
      (window as Window & { __rebirthTouchEvents?: string[] }).__rebirthTouchEvents = events;
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel']) {
        window.addEventListener(type, (event: Event) => {
          const touch = event as TouchEvent;
          const pointer = event as PointerEvent;
          events.push(type + ':target=' + (event.target as HTMLElement)?.id +
            ':pointer=' + (pointer.pointerId ?? '-') +
            ':active=' + (touch.touches?.length ?? '-') +
            ':changed=' + (touch.changedTouches?.length ?? '-'));
        }, { capture: true });
      }
    });
    const client = await page.context().newCDPSession(page);
    const finger = { x: Math.round(base!.x + base!.width / 2), y: Math.round(base!.y + base!.height / 2) };
    const moved = { x: finger.x + 40, y: finger.y - 10 };
    const strike = { x: Math.round(attack!.x + attack!.width / 2), y: Math.round(attack!.y + attack!.height / 2) };
    await page.evaluate(() => { for (const kind of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'touchcancel']) window.addEventListener(kind, (e) => { const t = e as TouchEvent; console.log('ALPHA_TOUCH_EVENT', kind, (e.target as HTMLElement)?.id, t.touches?.length, t.changedTouches?.length); }, true); });
    page.on('console', msg => { if (msg.text().startsWith('ALPHA_TOUCH_EVENT')) console.log(msg.text()); });
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
    console.log('ALPHA_TOUCH_BEFORE_RELEASE', await page.evaluate(() => ({ pressed: document.getElementById('attack')?.className })));
    // CDP touchEnd's touchPoints specifies the touch to END, not the
    // remaining touches. End the attack pointer (id 2), preserve joystick 1.
    await dispatch('touchEnd', [{ ...strike, id: 2 }]);
    console.log('ALPHA_TOUCH_AFTER_RELEASE', await page.evaluate(() => ({ pressed: document.getElementById('attack')?.className })));

    console.log('MULTITOUCH_RELEASE_DIAGNOSTIC', await page.evaluate(() =>
      (window as Window & { __rebirthTouchEvents?: string[] }).__rebirthTouchEvents));
    await expect(page.locator('#attack')).not.toHaveClass(/pressed/);
    await dispatch('touchEnd', [{ ...moved, id: 1 }]);
    await expect.poll(() => page.locator('#stick-knob').evaluate(
      el => parseFloat((el as HTMLElement).style.left),
    )).toBeCloseTo(finger.x, 0);
    await client.detach();
  });
});
