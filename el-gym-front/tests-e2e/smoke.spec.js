import { test, expect, crearAdmin } from './fixtures.js';

test('la landing pública carga', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
});

test('el backend e2e local responde y el proxy funciona', async () => {
    const admin = await crearAdmin({ email: 'smoke-e2e@x.com', password: 'secret123' });
    expect(admin.token).toBeTruthy();
});
