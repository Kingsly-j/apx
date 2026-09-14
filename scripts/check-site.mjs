import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
for (const route of ['', 'about', 'services', 'order', 'contact', 'diplomatic']) {
  const response = await page.goto(`http://localhost:3000/${route}`);
  assert.equal(response.status(), 200, route);
  await page.locator('h1').waitFor();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('img').evaluateAll(images => images.filter(img => !img.complete || !img.naturalWidth).length), 0, `${route}: broken images`);
  if (!route) {
    await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
    const form = page.locator('form').filter({ has: page.locator('button', { hasText: 'Track Shipment' }) }).last();
    await form.locator('input[name="trackingnumber"]').fill('JM123456789');
    await form.locator('button[type="submit"]').click();
    await page.waitForURL('**/track?code=JM123456789');
    await page.getByRole('heading', {name:'Follow your delivery.'}).waitFor();
  }
  console.log(`PASS /${route}`);
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000/');
await page.getByRole('button', { name: 'Toggle navigation' }).click();
await page.locator('header').getByRole('link', { name: 'About', exact: true }).last().waitFor({ state: 'visible' });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile overflow');
await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
assert.deepEqual(errors, []);
console.log('PASS mobile menu, tracking feedback, and no browser errors');
await browser.close();
