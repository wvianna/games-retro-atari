import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Atari Vault — smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('page title contains ATARI VAULT', async ({ page }) => {
    await expect(page).toHaveTitle(/ATARI VAULT/i);
  });

  test('game grid loads with cards', async ({ page }) => {
    // Wait for at least one game card to appear
    await page.waitForSelector('.game-card', { timeout: 15_000 });
    const count = await page.locator('.game-card').count();
    expect(count).toBeGreaterThan(100);
  });

  test('ROM count badge shows > 0', async ({ page }) => {
    await page.waitForSelector('.game-card');
    const countText = await page.locator('#rom-count').innerText();
    expect(Number(countText)).toBeGreaterThan(0);
  });

  test('search filters the grid', async ({ page }) => {
    await page.waitForSelector('.game-card');
    const before = await page.locator('.game-card').count();

    await page.fill('#search-input', 'pitfall');
    await page.waitForTimeout(400); // debounce

    const after = await page.locator('.game-card').count();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  test('no results message shown for gibberish search', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.fill('#search-input', 'zzznobodyhasthisgame');
    await page.waitForTimeout(400);
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('clicking a game card opens the emulator overlay', async ({ page }) => {
    await page.waitForSelector('.game-card');
    // Click the first PLAY button
    await page.locator('.card-play-btn').first().click();
    await expect(page.locator('#emulator-overlay')).not.toHaveClass(/hidden/);
  });

  test('ESC closes the emulator overlay', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.locator('.card-play-btn').first().click();
    await expect(page.locator('#emulator-overlay')).not.toHaveClass(/hidden/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#emulator-overlay')).toHaveClass(/hidden/);
  });

  test('PAL filter reduces card count', async ({ page }) => {
    await page.waitForSelector('.game-card');
    const before = await page.locator('.game-card').count();
    await page.selectOption('#filter-region', 'PAL');
    await page.waitForTimeout(200);
    const after = await page.locator('.game-card').count();
    expect(after).toBeLessThan(before);
  });

  test('default view is list (game-grid has class game-list)', async ({ page }) => {
    await page.waitForSelector('.game-card');
    const gameGrid = page.locator('#game-grid');
    await expect(gameGrid).toHaveClass(/game-list/);
  });

  test('grid view button switches to grid layout', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.click('#btn-grid-view');
    const gameGrid = page.locator('#game-grid');
    await expect(gameGrid).toHaveClass(/game-grid/);
    await expect(gameGrid).not.toHaveClass(/game-list/);
  });

  test('list view button switches back to list layout', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.click('#btn-grid-view');
    await page.click('#btn-list-view');
    const gameGrid = page.locator('#game-grid');
    await expect(gameGrid).toHaveClass(/game-list/);
  });

  test('volume slider is visible in emulator overlay', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.locator('.card-play-btn').first().click();
    await expect(page.locator('#emulator-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#volume-slider')).toBeVisible();
  });

  test('mute button is visible in emulator overlay', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.locator('.card-play-btn').first().click();
    await expect(page.locator('#emulator-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#btn-mute')).toBeVisible();
  });

  test('controls guide contains kbd elements', async ({ page }) => {
    await page.waitForSelector('.game-card');
    await page.locator('.card-play-btn').first().click();
    await expect(page.locator('#emulator-overlay')).not.toHaveClass(/hidden/);
    const kbdCount = await page.locator('.controls-guide kbd').count();
    expect(kbdCount).toBeGreaterThanOrEqual(4);
  });
});
