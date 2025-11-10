import { test, expect } from '@playwright/test';

test('homepage renders featured sections and product cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /nidhis dry fruits/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Frequently Bought Products/i })).toBeVisible();
  const cards = page.locator('section:has-text("Frequently Bought") div [class*="rounded-xl"]');
  await expect(cards.first()).toBeVisible();
});
