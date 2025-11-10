import { test, expect } from '@playwright/test';

test('category page lists products from Supabase', async ({ page }) => {
  await page.goto('/category/nidhis-dry-fruits');
  await expect(page.getByRole('heading', { name: /nidhis dry fruits/i })).toBeVisible();
  const cards = page.getByTestId('product-card');
  await expect(cards.first()).toBeVisible();
  await expect(cards).not.toHaveCount(0);
});
