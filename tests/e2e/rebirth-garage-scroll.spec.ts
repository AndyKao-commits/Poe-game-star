import { expect, test } from '@playwright/test';

/** Regression: the B2 investigation contains more text and choices than fit
 * in a short landscape iPhone viewport. The normal combat surface must still
 * suppress gestures; only the open investigation permits vertical panning.
 */
test.describe('B2 investigation landscape touch scrolling', () => {
  test.use({ viewport: { width: 932, height: 300 }, isMobile: true, hasTouch: true });

  test('allows scrolling the card and restores gesture guard after leaving', async ({ page }) => {
    await page.goto('/rebirth-alpha.html');
    const app = page.locator('#app');
    const card = page.locator('#parking-card');
    await expect(app).toHaveCSS('touch-action', 'none');

    // Isolate the layout and touch-action behavior from combat progression.
    // A separate real-scene E2E test covers entering B2 after alley victory.
    await page.evaluate(() => {
      const app = document.getElementById('app')!;
      const panel = document.getElementById('parking-panel')!;
      app.classList.add('investigating');
      panel.hidden = false;
      document.getElementById('parking-story')!.textContent =
        '停車場內的纜線通往非法增幅器工坊，受困者仍在等待救援。'.repeat(28);
      const actions = document.getElementById('parking-actions')!;
      for (let i = 0; i < 5; i++) {
        const button = document.createElement('button');
        button.textContent = '調查線索 ' + i;
        actions.append(button);
      }
    });

    await expect(page.locator('#parking-panel')).toBeVisible();
    for (const selector of ['html', 'body', '#app', '#parking-panel', '#parking-card']) {
      await expect(page.locator(selector)).toHaveCSS('touch-action', 'pan-y');
    }
    const dimensions = await card.evaluate(el => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight + 80);

    // Wheel scrolling is cross-browser; touch-action assertions above guard
    // against the iOS gesture suppression that wheel-only tests miss.
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, 550);
    await expect.poll(() => card.evaluate(el => el.scrollTop)).toBeGreaterThan(20);

    await page.evaluate(() => {
      document.getElementById('parking-panel')!.hidden = true;
      document.getElementById('app')!.classList.remove('investigating');
    });
    await expect(app).toHaveCSS('touch-action', 'none');
    await expect(page.locator('#parking-panel')).toBeHidden();
  });
});
