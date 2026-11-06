import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVerificationCode,
  verifyCode,
  getUserByEmail,
  createUser,
  createSession,
  getUserByToken,
  deleteSession,
  getUserByWalletAddress,
  updateUserSocial,
  updateUserWallet,
  createWalletChallenge,
  verifyWalletChallenge,
  hashPassword,
  verifyPassword,
  getUserByUsername,
  updateUserProfile
} from '../src/db.js';

test('ArcBounty SQLite Auth & Verification Database Tests', async (t) => {
  const testEmail = `test_db_${Date.now()}@arc.network`;

  await t.test('generates and stores 6-digit verification code with 10-minute expiry', () => {
    const { code, expiresAt } = createVerificationCode(testEmail, 'signup');
    assert.equal(typeof code, 'string');
    assert.equal(code.length, 6);
    assert.ok(expiresAt > Date.now());
  });

  await t.test('rejects incorrect verification code', () => {
    const result = verifyCode(testEmail, '000000', 'signup');
    assert.equal(result.valid, false);
  });

  await t.test('binds verification codes to their original purpose', () => {
    const { code } = createVerificationCode(testEmail, 'login');
    const crossPurpose = verifyCode(testEmail, code, 'signup');
    assert.equal(crossPurpose.valid, false);
    const correctPurpose = verifyCode(testEmail, code, 'login');
    assert.equal(correctPurpose.valid, true);
  });

  await t.test('validates correct verification code and prevents replay', () => {
    const { code } = createVerificationCode(testEmail, 'signup');
    const firstCheck = verifyCode(testEmail, code, 'signup');
    assert.equal(firstCheck.valid, true);

    // Replay attack prevention
    const secondCheck = verifyCode(testEmail, code, 'signup');
    assert.equal(secondCheck.valid, false);
  });

  await t.test('creates persistent user record without fabricating a wallet address', () => {
    const user = createUser({
      email: testEmail,
      name: 'Test Creator',
      username: `creator_${Date.now()}`,
      discipline: 'Development'
    });

    assert.ok(user.id.startsWith('usr_'));
    assert.equal(user.email, testEmail);
    assert.equal(user.wallet_address, null);
    assert.equal(user.discipline, 'Development');
    assert.equal(user.usdc_balance, 0.0);

    const fetched = getUserByEmail(testEmail);
    assert.equal(fetched.id, user.id);
  });

  await t.test('creates and validates persistent session token', () => {
    const user = getUserByEmail(testEmail);
    const { token } = createSession(user.id);
    assert.ok(token.startsWith('arc_sess_'));

    const sessionUser = getUserByToken(token);
    assert.equal(sessionUser.id, user.id);
    assert.equal(sessionUser.email, testEmail);

    // Logout revokes the token server-side.
    assert.equal(deleteSession(token), true);
    assert.equal(getUserByToken(token), null);
    assert.equal(deleteSession(token), false);
  });

  await t.test('links and unlinks social accounts (Telegram, Discord, X, GitHub)', () => {
    const user = getUserByEmail(testEmail);
    
    // Connect Telegram
    const u1 = updateUserSocial(user.id, 'telegram', '@arc_tg_user');
    assert.equal(u1.telegram, 'arc_tg_user');

    // Connect Discord
    const u2 = updateUserSocial(user.id, 'discord', 'arc_discord#1234');
    assert.equal(u2.discord, 'arc_discord#1234');

    // Connect X
    const u3 = updateUserSocial(user.id, 'x', '@arc_x_creator');
    assert.equal(u3.x, 'arc_x_creator');

    // Connect GitHub
    const u4 = updateUserSocial(user.id, 'github', 'arc-gh-dev');
    assert.equal(u4.github, 'arc-gh-dev');

    // Disconnect Telegram
    const u5 = updateUserSocial(user.id, 'telegram', null);
    assert.equal(u5.telegram, null);
  });

  await t.test('updates and persists EVM wallet connection on Arc L1', () => {
    const user = getUserByEmail(testEmail);
    const newAddr = '0x1234567890abcdef1234567890abcdef12345678';
    const updated = updateUserWallet(user.id, newAddr);
    assert.equal(updated.wallet_address, newAddr.toLowerCase());
  });

  await t.test('normalizes padded or mixed-case wallet addresses before storage and lookup', () => {
    const user = getUserByEmail(testEmail);
    const paddedAddress = '  0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD  ';

    const updated = updateUserWallet(user.id, paddedAddress);
    assert.equal(updated.wallet_address, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

    const found = getUserByWalletAddress(' 0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD ');
    assert.equal(found.id, user.id);
  });

  await t.test('rejects linking a wallet already owned by another account', () => {
    const owner = getUserByEmail(testEmail);
    const duplicateEmail = `wallet_dup_${Date.now()}@arc.network`;
    const other = createUser({
      email: duplicateEmail,
      name: 'Other Creator',
      username: `wallet_dup_${Date.now()}`
    });

    assert.throws(() => {
      updateUserWallet(other.id, owner.wallet_address);
    }, /already linked/i);
  });

  await t.test('creates cryptographic challenge nonce and prevents replay', () => {
    const testWallet = '0x9999999999999999999999999999999999999999';
    const challenge = createWalletChallenge(testWallet);
    assert.ok(challenge.nonce);
    assert.ok(challenge.message.includes(testWallet.toLowerCase()));

    // First verification succeeds
    const check1 = verifyWalletChallenge(testWallet, challenge.nonce);
    assert.equal(check1.valid, true);

    // Second verification fails (prevent replay)
    const check2 = verifyWalletChallenge(testWallet, challenge.nonce);
    assert.equal(check2.valid, false);
  });

  await t.test('securely hashes and verifies user password with salt', () => {
    const rawPass = 'SecretArc2026!#Pass';
    const hash = hashPassword(rawPass);
    assert.ok(hash.includes(':'));

    // Correct password validates
    assert.equal(verifyPassword(rawPass, hash), true);

    // Wrong password fails
    assert.equal(verifyPassword('WrongPassword123', hash), false);
    assert.equal(verifyPassword('', hash), false);
  });

  await t.test('creates user with password and verifies login authentication', () => {
    const pwEmail = `creator_pw_${Date.now()}@arc.network`;
    const user = createUser({
      email: pwEmail,
      name: 'Password Creator',
      username: `pw_user_${Date.now()}`,
      password: 'MyStrongPassword123!',
      discipline: 'Content'
    });

    assert.ok(user.id);
    const dbUser = getUserByEmail(pwEmail);
    assert.ok(dbUser.password_hash);
    assert.equal(verifyPassword('MyStrongPassword123!', dbUser.password_hash), true);
    assert.equal(verifyPassword('IncorrectPassword', dbUser.password_hash), false);
  });

  await t.test('strictly enforces creator handle uniqueness case-insensitively', () => {
    const handleTestEmail1 = `creator_uniq1_${Date.now()}@arc.network`;
    const handleTestEmail2 = `creator_uniq2_${Date.now()}@arc.network`;

    // 1. Create first user with unique handle
    const user1 = createUser({
      email: handleTestEmail1,
      name: 'Alpha Creator',
      username: 'solidity_wizard',
      discipline: 'Dev'
    });
    assert.equal(user1.username, 'solidity_wizard');

    // 2. Lookup finds user case-insensitively
    const foundLower = getUserByUsername('solidity_wizard');
    const foundUpper = getUserByUsername('SOLIDITY_WIZARD');
    const foundMixed = getUserByUsername('Solidity_Wizard');
    assert.ok(foundLower);
    assert.equal(foundLower.id, user1.id);
    assert.equal(foundUpper.id, user1.id);
    assert.equal(foundMixed.id, user1.id);

    // 3. Create second user with different handle
    const user2 = createUser({
      email: handleTestEmail2,
      name: 'Beta Creator',
      username: 'solidity_apprentice',
      discipline: 'Dev'
    });
    assert.equal(user2.username, 'solidity_apprentice');

    // 4. Updating user2 to user1's handle must fail (exact match)
    assert.throws(() => {
      updateUserProfile(user2.id, { username: 'solidity_wizard' });
    }, /already taken/i);

    // 5. Updating user2 to user1's handle with uppercase must fail (case-insensitive)
    assert.throws(() => {
      updateUserProfile(user2.id, { username: 'SOLIDITY_WIZARD' });
    }, /already taken/i);

    // 6. User1 updating their own handle with same name or different casing succeeds
    const updatedSelf = updateUserProfile(user1.id, { username: 'solidity_wizard' });
    assert.equal(updatedSelf.username, 'solidity_wizard');

    // 7. Creating user with strictUsername=true must fail if handle taken
    assert.throws(() => {
      createUser({
        email: `creator_uniq3_${Date.now()}@arc.network`,
        name: 'Gamma Creator',
        username: 'solidity_wizard',
        strictUsername: true
      });
    }, /already taken/i);
  });

  await t.test('authenticated user linking wallet updates existing profile and retains single unified account', () => {
    const unifiedEmail = `unified_${Date.now()}@arc.network`;
    const user = createUser({
      email: unifiedEmail,
      name: 'Unified Tester',
      username: `unified_${Date.now()}`
    });

    const { token } = createSession(user.id);
    const newWallet = '0x1122334455667788990011223344556677889900';

    // Update wallet on the existing user account
    const updated = updateUserWallet(user.id, newWallet);
    assert.equal(updated.id, user.id);
    assert.equal(updated.wallet_address, newWallet.toLowerCase());
    assert.equal(updated.email, unifiedEmail);

    // Verify session retrieval retains the updated wallet on the same profile
    const sessionUser = getUserByToken(token);
    assert.equal(sessionUser.id, user.id);
    assert.equal(sessionUser.wallet_address, newWallet.toLowerCase());
  });
});

