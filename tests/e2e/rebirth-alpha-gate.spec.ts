import { expect, test } from '@playwright/test';

test.describe('Rebirth private Alpha art gate', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test('does not unlock gameplay with missing original enemy art', async ({ page }) => {
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#status-title')).toHaveText('戰鬥尚未開放');
    await expect(page.locator('#start')).toBeDisabled();
    await expect(page.locator('#asset-list')).toContainText('fire-brawler-character.png');
    await expect(page.locator('#controls')).toBeHidden();
    await expect(page.locator('#game canvas')).toHaveCount(0);
  });

  test('rejects HTML SPA fallback pretending to be image/json', async ({ page }) => {
    await page.route('**/rebirth/art/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html>not an asset</html>' });
    });
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#status-title')).toHaveText('戰鬥尚未開放');
    await expect(page.locator('#asset-list')).toContainText('格式錯誤');
    await expect(page.locator('#start')).toBeDisabled();
  });

  test('only enables the dev start control when all required art paths pass MIME preflight', async ({ page }) => {
    await page.route('**/rebirth/art/**', async route => {
      const url = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: url.endsWith('.png') ? 'image/png' : 'application/json',
        body: url.endsWith('.png') ? 'PNG' : '{}',
      });
    });
    await page.goto('/rebirth-alpha.html');
    await expect(page.locator('#status-title')).toHaveText('資產已就緒，等待內測');
    await expect(page.locator('#start')).toBeEnabled();
    // Deliberately do not click: MIME is not actual art validation.
    await expect(page.locator('#game canvas')).toHaveCount(0);
  });
});
