import { test, expect } from '@playwright/test';

test('product detail page loads for kaju', async ({ page }) => {
  await page.goto('/product/kaju');
  await expect(page.getByRole('heading', { name: /kaju/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
});
