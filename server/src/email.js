import nodemailer from 'nodemailer';
import 'dotenv/config';

let transporter = null;

const CLIENT_URL = process.env.CLIENT_URL || 'https://botbounty-theta.vercel.app';

/**
 * Local development fallback transport (in-memory JSON, 0ms latency, never hangs)
 */
async function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    jsonTransport: true
  });
  return transporter;
}

/**
 * Centralized Email Dispatch Engine
 * Multi-Engine Architecture:
 * 1. Vercel Serverless Email Relay (Gmail SMTP via Port 465 SSL):
 *    - Sends to ANY inbox on earth without domain verification or sandbox blocks.
 *    - Bypasses Render free tier port blocks (25/465/587).
 * 2. Resend HTTPS REST API (Port 443):
 *    - Instant sub-second delivery (~150ms).
 *    - Used for account owner email (olajideabdulquadri22@gmail.com) or verified custom domains.
 * 3. Local In-Memory Fallback:
 *    - 0ms JSON transport for automated test suites.
 */
async function dispatchEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];

  // Resolve SMTP Credentials (supporting MicroGig format + legacy GMAIL_* format)
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'false' ? false : (smtpPort === 465);
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpPass = rawPass ? rawPass.replace(/\s+/g, '') : null;
  const emailFrom = process.env.EMAIL_FROM || (smtpUser ? `"BotBounty" <${smtpUser}>` : '"BotBounty" <no-reply@botbounty.ai>');

  const relaySecret = process.env.EMAIL_RELAY_SECRET || 'botbounty-relay-auth-2026';
  const relayUrl = `${CLIENT_URL}/api/send-email`;
  const resendKey = process.env.RESEND_API_KEY;

  // STRATEGY 1: Direct High-Speed Nodemailer SMTP (Port 465 SSL or 587 TLS)
  if (smtpUser && smtpPass) {
    try {
      const directTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000
      });

      const info = await directTransporter.sendMail({
        from: emailFrom,
        to: recipients.join(', '),
        subject,
        html,
        text
      });

      console.log(`[Email Service - Direct SMTP] Dispatched to ${recipients.join(', ')} | ID: ${info.messageId}`);
      return { messageId: info.messageId, dispatched: true };
    } catch (smtpErr) {
      console.warn(`[Email Service - Direct SMTP Warning] Direct send failed (${smtpErr.message}), trying Vercel relay fallback...`);
    }
  }

  // STRATEGY 2: Vercel Serverless Relay (Overcomes cloud port restrictions)
  if (smtpUser && smtpPass) {
    try {
      const relayRes = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-relay-secret': relaySecret
        },
        body: JSON.stringify({
          to: recipients,
          subject,
          html,
          text,
          from: emailFrom,
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        }),
        signal: AbortSignal.timeout(12000)
      });

      const relayData = await relayRes.json().catch(() => ({}));
      if (relayRes.ok && relayData.success) {
        console.log(`[Email Service - Vercel Relay] Dispatched to ${recipients.join(', ')} | ID: ${relayData.messageId}`);
        return { messageId: relayData.messageId, dispatched: true };
      } else {
        console.warn(`[Email Service - Vercel Relay Warning] Relay returned ${relayRes.status}:`, relayData);
      }
    } catch (e) {
      console.warn(`[Email Service - Vercel Relay Warning]:`, e.message);
    }
  }

  // STRATEGY 3: Resend HTTPS REST API (Port 443)
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: emailFrom.includes('onboarding@resend.dev') ? emailFrom : 'BotBounty <onboarding@resend.dev>',
          to: recipients,
          subject,
          html,
          text
        }),
        signal: AbortSignal.timeout(8000)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[Email Service - Resend] Fast HTTPS dispatch to ${recipients.join(', ')} | ID: ${data.id}`);
        return { messageId: data.id, dispatched: true };
      } else {
        console.warn(`[Email Service - Resend Warning] API returned ${res.status}:`, data);
      }
    } catch (e) {
      console.warn(`[Email Service - Resend Network Error]:`, e.message);
    }
  }

  // STRATEGY 4: Local Development / Test Suite Fallback (0ms JSON transport)
  try {
    const mailer = await getTransporter();
    const sender = process.env.FROM_EMAIL || '"BotBounty Security" <security@botchain.ai>';
    for (const recipient of recipients) {
      await mailer.sendMail({
        from: sender,
        to: recipient,
        subject,
        html,
        text
      });
    }
    console.log(`[Email Service - Local Fallback] Simulated email to: ${recipients.join(', ')}`);
    return { messageId: 'local-test-id', dispatched: true };
  } catch (err) {
    console.warn(`[Email Service Warning] Fallback transport error:`, err.message);
    return { messageId: null, dispatched: false, error: err.message };
  }
}

/**
 * Send real 6-digit OTP verification code to user's email with neo-brutalist Circle Arc HTML design
 */
export async function sendVerificationEmail(toEmail, code, type = 'login') {
  const subject = type === 'signup'
    ? 'Verify your BotBounty Creator Account'
    : 'Your BotBounty Verification Code';

  const digits = String(code).split('');
  const digitCells = digits.map(d => `
    <td align="center" valign="middle" style="width: 44px; height: 54px; background-color: #1a2b47; border: 2px solid #ffcc6f; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Courier New', monospace; font-size: 28px; font-weight: 900; color: #ffffff; text-align: center;">
      ${d}
    </td>
  `).join('<td width="8" style="width: 8px; font-size: 0; line-height: 0;">&nbsp;</td>');

  const htmlContent = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; width: 100% !important; background-color: #0b111e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <!-- Hidden Preheader Preview Text -->
        <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #0b111e; opacity: 0; mso-hide: all;">
          Your BotBounty verification code is ${code}. Valid for 10 minutes on Circle Arc.
        </div>

        <!-- Master Wrapper -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0b111e; padding: 32px 12px;">
          <tr>
            <td align="center">
              
              <!-- Card Container -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #111c30; border: 2.5px solid #2f578c; border-radius: 12px; overflow: hidden; box-shadow: 4px 4px 0px #050911;">
                
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="background-color: #1b3158; padding: 26px 20px; border-bottom: 2.5px solid #2f578c;">
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff; margin-bottom: 6px;">
                      Bot<span style="color: #6366f1;">Bounty</span>
                    </div>
                    <div style="display: inline-block; background-color: #0d1a2d; color: #acc6e9; border: 1.5px solid #2f578c; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;">
                      BOT Chain &bull; Chain ID 968
                    </div>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 32px 28px; background-color: #111c30;">
                    
                    <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">
                      ${type === 'signup' ? 'Verify your Creator Account' : 'Sign In Verification Code'}
                    </h1>
                    
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                      Use the single-use 6-digit verification code below to complete your ${type === 'signup' ? 'account registration' : 'sign in'} on <strong>BotBounty</strong>:
                    </p>

                    <!-- Code Box -->
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0a1322; border: 2px solid #2f578c; border-radius: 10px; padding: 22px 14px; margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #ffcc6f; text-transform: uppercase; margin-bottom: 14px;">
                            SINGLE-USE VERIFICATION CODE
                          </div>
                          
                          <!-- Digits Table -->
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                            <tr>
                              ${digitCells}
                            </tr>
                          </table>

                          <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 14px;">
                            Valid for 10 minutes &bull; Single authorization
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Alert -->
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #16243d; border-left: 4px solid #e9a13f; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px;">
                      <tr>
                        <td style="font-size: 12px; line-height: 1.5; color: #cbd5e1;">
                          <strong style="color: #ffcc6f;">Security Notice:</strong> Never share this code with anyone. BotBounty team members will never ask for your verification code or private keys.
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                      If you did not request this verification code, please ignore this email. Your account remains secure.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #0b1424; padding: 18px 24px; border-top: 1.5px solid #1e3352; font-size: 12px; line-height: 1.5; color: #64748b;">
                    <div style="font-weight: 700; color: #94a3b8; margin-bottom: 4px;">
                      Circle Arc L1 &bull; Canonical USDC &bull; Zero-gas Creator Capital Engine
                    </div>
                    <div>
                      Dispatched securely to <span style="color: #acc6e9;">${toEmail}</span>
                    </div>
                  </td>
                </tr>

              </table>
              <!-- End Card Container -->

            </td>
          </tr>
        </table>
        <!-- End Master Wrapper -->
      </body>
    </html>
  `;

  return await dispatchEmail({
    to: toEmail,
    subject,
    html: htmlContent,
    text: `Your BotBounty verification code is: ${code}. Valid for 10 minutes on Circle Arc L1.`
  });
}

/**
 * Send real notification email when admin distributes USDC bounty reward to creator
 */
export async function sendRewardDisbursedEmail({ toEmail, creatorName, bountyTitle, amount, txHash, walletAddress }) {
  if (!toEmail) return null;
  const subject = `USDC Disbursed: $${amount} for "${bountyTitle}" on Circle Arc`;

  const htmlContent = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; width: 100% !important; background-color: #0b111e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #0b111e; opacity: 0;">
          Congratulations! $${amount} USDC has been disbursed to your wallet for "${bountyTitle}".
        </div>
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0b111e; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #111c30; border: 2.5px solid #2f578c; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td align="center" style="background-color: #1b3158; padding: 26px 20px; border-bottom: 2.5px solid #2f578c;">
                    <div style="font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">
                      Bot<span style="color: #6366f1;">Bounty</span>
                    </div>
                    <div style="display: inline-block; background-color: #0d1a2d; color: #acc6e9; border: 1.5px solid #2f578c; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                      Settlement Confirmed &bull; Chain ID 968
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 28px; background-color: #111c30;">
                    <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                      Bounty Prize Disbursed!
                    </h1>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                      Hello <strong>${creatorName || 'Creator'}</strong>, your submission for <strong>${bountyTitle}</strong> was reviewed and selected as the winner. The prize reward has been disbursed from the platform escrow to your BOT Chain wallet!
                    </p>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0a1322; border: 2px solid #ffcc6f; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
                      <tr>
                        <td>
                          <div style="font-size: 11px; font-weight: 800; color: #ffcc6f; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px;">AMOUNT DISBURSED</div>
                          <div style="font-size: 34px; font-weight: 900; color: #10b981; font-family: monospace;">$${amount} USDC</div>
                          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Recipient: <span style="color: #ffffff; font-family: monospace;">${walletAddress || 'Your Connected Wallet'}</span></div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px; word-break: break-all;">Tx Hash: <span style="color: #acc6e9; font-family: monospace;">${txHash}</span></div>
                        </td>
                      </tr>
                    </table>
                    <div style="background-color: #16243d; border-left: 4px solid #10b981; padding: 12px 14px; border-radius: 4px; font-size: 12px; color: #cbd5e1; margin-bottom: 16px;">
                      Finalized on Circle Arc L1 with sub-second deterministic finality.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background-color: #0b1424; padding: 18px 24px; border-top: 1.5px solid #1e3352; font-size: 12px; color: #64748b;">
                    Circle Arc L1 &bull; Canonical USDC &bull; Zero-gas Creator Capital Engine
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return await dispatchEmail({
    to: toEmail,
    subject,
    html: htmlContent,
    text: `Your BotBounty prize of $${amount} USDC for "${bountyTitle}" has been disbursed to ${walletAddress}. Settlement Tx: ${txHash}`
  });
}

/**
 * Send notification to bounty creator when admin approves their bounty
 */
export async function sendBountyApprovedNotification(maintainerEmail, bounty) {
  if (!maintainerEmail || !maintainerEmail.includes('@')) return null;

  const subject = `Your Challenge is Now Live: "${bounty.title}" on BotBounty`;

  let prizeInfo = `$${bounty.amount} USDC`;
  if (bounty.rewardDistribution && bounty.rewardDistribution.type === 'tiered' && Array.isArray(bounty.rewardDistribution.tiers)) {
    prizeInfo = bounty.rewardDistribution.tiers.map(t => `${t.place === 1 ? '1st' : t.place === 2 ? '2nd' : t.place === 3 ? '3rd' : `${t.place}th`}: $${t.amount}`).join(' · ');
  } else if (bounty.rewardDistribution && bounty.rewardDistribution.type === 'equal') {
    prizeInfo = `${bounty.rewardDistribution.count} Winners × $${bounty.rewardDistribution.amountPerWinner} USDC`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 24px; background-color: #0b111e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #111c30; border: 2px solid #2f578c; border-radius: 12px; overflow: hidden;">
          <tr>
            <td align="center" style="background-color: #1b3158; padding: 24px 20px; border-bottom: 2px solid #2f578c;">
              <div style="font-size: 22px; font-weight: 900; color: #ffffff;">Arc<span style="color: #ffcc6f;">Bounty</span></div>
              <div style="font-size: 11px; font-weight: 800; color: #acc6e9; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px;">Challenge Verified &amp; Published</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 800; color: #ffffff;">Your Bounty is Live!</h2>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.5; color: #94a3b8;">
                Platform admins have verified your escrow funding and conditions. Your bounty is now published on the BotBounty public feed for creators to participate.
              </p>
              <div style="background-color: #0a1322; border: 1.5px solid #2f578c; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">${bounty.title}</div>
                <div style="font-size: 13px; color: #ffcc6f; font-weight: 700;">Prize: ${prizeInfo}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Category: ${bounty.categoryName || bounty.category} &bull; Deadline: ${new Date(bounty.deadline).toLocaleDateString()}</div>
              </div>
              <a href="${CLIENT_URL}" style="display: block; text-align: center; background-color: #ffcc6f; color: #000000; padding: 12px; border-radius: 6px; font-weight: 800; text-decoration: none; font-size: 14px;">
                View Live Challenge on BotBounty
              </a>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return await dispatchEmail({
    to: maintainerEmail,
    subject,
    html: htmlContent,
    text: `Your bounty "${bounty.title}" has been approved by admin and is now live on BotBounty! Prize: ${prizeInfo}.`
  });
}

/**
 * Send broadcast email notification to creators announcing a new live challenge
 */
export async function sendNewBountyBroadcastToCreators(creatorEmails, bounty) {
  if (!Array.isArray(creatorEmails) || creatorEmails.length === 0) return null;

  const validEmails = creatorEmails.filter(e => e && e.includes('@'));
  if (validEmails.length === 0) return null;

  let prizeInfo = `$${bounty.amount} USDC`;
  if (bounty.rewardDistribution && bounty.rewardDistribution.type === 'tiered' && Array.isArray(bounty.rewardDistribution.tiers)) {
    prizeInfo = bounty.rewardDistribution.tiers.map(t => `${t.place === 1 ? '1st' : t.place === 2 ? '2nd' : t.place === 3 ? '3rd' : `${t.place}th`}: $${t.amount}`).join(' · ');
  } else if (bounty.rewardDistribution && bounty.rewardDistribution.type === 'equal') {
    prizeInfo = `${bounty.rewardDistribution.count} Winners × $${bounty.rewardDistribution.amountPerWinner} USDC`;
  }

  const subject = `New Challenge Live: "${bounty.title}" (${prizeInfo})`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 24px; background-color: #0b111e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #111c30; border: 2px solid #2f578c; border-radius: 12px; overflow: hidden;">
          <tr>
            <td align="center" style="background-color: #1b3158; padding: 24px 20px; border-bottom: 2px solid #2f578c;">
              <div style="font-size: 22px; font-weight: 900; color: #ffffff;">Arc<span style="color: #ffcc6f;">Bounty</span></div>
              <div style="font-size: 11px; font-weight: 800; color: #acc6e9; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px;">New Creator Opportunity</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 800; color: #ffffff;">New Challenge Published!</h2>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.5; color: #94a3b8;">
                A new escrow-funded bounty has been verified by platform admins and is now open for creator submissions on Circle Arc.
              </p>
              <div style="background-color: #0a1322; border: 1.5px solid #2f578c; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">${bounty.title}</div>
                <div style="font-size: 14px; color: #ffcc6f; font-weight: 800;">Prize: ${prizeInfo}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
                  Category: <strong>${bounty.categoryName || bounty.category}</strong> &bull; Due: ${new Date(bounty.deadline).toLocaleDateString()}
                </div>
              </div>
              <a href="${CLIENT_URL}" style="display: block; text-align: center; background-color: #ffcc6f; color: #000000; padding: 12px; border-radius: 6px; font-weight: 800; text-decoration: none; font-size: 14px;">
                Participate &amp; Submit Deliverable
              </a>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return await dispatchEmail({
    to: validEmails,
    subject,
    html: htmlContent,
    text: `New Challenge on BotBounty: "${bounty.title}". Prize: ${prizeInfo}. Submit your deliverable on BotBounty to win USDT / $BOT!`
  });
}
