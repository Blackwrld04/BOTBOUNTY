import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { authRouter } from '../src/routes/auth.js';
import { createUser, createVerificationCode } from '../src/db.js';

/**
 * Route-level regression tests for flows that unit tests cannot reach:
 * password reset via OTP, login with the new password, and server-side
 * session revocation on logout.
 */
test('Auth HTTP Routes', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const email = `route_reset_${Date.now()}@arc.network`;
  const username = `route_reset_${Date.now()}`;

  createUser({
    email,
    name: 'Route Reset User',
    username,
    password: 'OldPassword123!',
    discipline: 'Development'
  });

  await t.test('reset code updates the password, issues a session, and logout revokes it', async () => {
    const { code } = createVerificationCode(email, 'reset');

    const resetRes = await fetch(`${base}/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        type: 'reset',
        password: 'NewPassword456!'
      })
    });
    const resetData = await resetRes.json();
    assert.equal(resetRes.status, 200, JSON.stringify(resetData));
    assert.ok(resetData.token);

    const oldLoginRes = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'OldPassword123!' })
    });
    assert.equal(oldLoginRes.status, 401);

    const loginRes = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'NewPassword456!' })
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200, JSON.stringify(loginData));
    assert.ok(loginData.token);

    const meRes = await fetch(`${base}/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    assert.equal(meRes.status, 200);

    const logoutRes = await fetch(`${base}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    assert.equal(logoutRes.status, 200);

    const revokedRes = await fetch(`${base}/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    assert.equal(revokedRes.status, 401);
  });

  await t.test('login rejects a missing password for OTP-only accounts', async () => {
    const otpEmail = `route_otp_${Date.now()}@arc.network`;
    createUser({
      email: otpEmail,
      name: 'OTP Only User',
      username: `route_otp_${Date.now()}`,
      discipline: 'Content'
    });

    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, password: 'anything123' })
    });
    assert.equal(res.status, 401);
  });
});
