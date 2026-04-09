import { test, expect } from '@playwright/test';

test('Happy path: Create session, join, submit restaurant, end session', async ({ browser }) => {
  // We'll create two isolated contexts: one for Owner, one for Member
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  // Mocking auth cookies to bypass Google OAuth login
  await ownerContext.addCookies([
    { name: 'access_token', value: 'MOCK_TOKEN_OWNER', domain: 'localhost', path: '/' },
  ]);

  await memberContext.addCookies([
    { name: 'access_token', value: 'MOCK_TOKEN_MEMBER', domain: 'localhost', path: '/' },
  ]);

  // OWNER: Navigate and Create Session
  await ownerPage.goto('http://localhost:3000/sessions');

  // They should see the "Create New Session" form
  const createInput = ownerPage.locator('input[placeholder="E.g. Friday Team Lunch"]');
  await createInput.fill('Playwright Test Lunch');
  await ownerPage.locator('button', { hasText: 'Create' }).click();

  // We should be redirected to the new session room
  await expect(ownerPage).toHaveURL(/localhost:3000\/sessions\/\d+/);

  // Extract Session ID from URL
  const sessionUrl = ownerPage.url();
  const sessionId = Array.from(sessionUrl.matchAll(/\/sessions\/(\d+)/g))[0][1];

  // MEMBER: Navigate to the sessions page, join the session
  await memberPage.goto('http://localhost:3000/sessions');
  const joinButton = memberPage.locator(`button`, { hasText: 'Join Session' }).first(); // Assuming it's the first one recently created
  await joinButton.click();

  // MEMBER: Wait for room to load and submit a restaurant
  await expect(memberPage).toHaveURL(new RegExp(`localhost:3000/sessions/${sessionId}`));

  const submitInput = memberPage.locator('input[placeholder="E.g. Burger King"]');
  await submitInput.fill('Test Restaurant A');
  await memberPage.locator('button', { hasText: 'Submit' }).click();

  // Ensure suggestion appeared for Member
  await expect(memberPage.locator('li', { hasText: 'Test Restaurant A' })).toBeVisible();

  // Ensure suggestion appeared for Owner (real-time WebSocket test)
  await expect(ownerPage.locator('li', { hasText: 'Test Restaurant A' })).toBeVisible();

  // OWNER: End Session
  const endButton = ownerPage.locator('button', { hasText: 'End Session & Pick' });
  await endButton.click();

  // Both should see the Decided status
  await expect(ownerPage.locator('h1', { hasText: 'Lunch Decided!' })).toBeVisible();
  await expect(ownerPage.locator('h2', { hasText: 'Test Restaurant A' })).toBeVisible();

  await expect(memberPage.locator('h1', { hasText: 'Lunch Decided!' })).toBeVisible();
  await expect(memberPage.locator('h2', { hasText: 'Test Restaurant A' })).toBeVisible();

  // Cleanup contexts
  await ownerContext.close();
  await memberContext.close();
});
