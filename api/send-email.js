import nodemailer from 'nodemailer';
import { createHash, timingSafeEqual } from 'crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeSecretMatch(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string' || !expected) return false;
  const suppliedDigest = createHash('sha256').update(supplied).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

/**
 * BotBounty Vercel Serverless Email Relay
 *
 * This endpoint only relays already-rendered transactional email. SMTP
 * credentials, host, port and sender are fixed by the deployment environment;
 * callers can never override them.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'BotBounty Email Relay' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const expectedSecret = process.env.EMAIL_RELAY_SECRET;
    if (!expectedSecret || expectedSecret.length < 24) {
      return res.status(503).json({ error: 'Email relay is not configured.' });
    }

    const suppliedSecret = req.headers['x-relay-secret'];
    if (!safeSecretMatch(suppliedSecret, expectedSecret)) {
      return res.status(401).json({ error: 'Unauthorized relay request' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }
    }
    body = body || {};

    const { to, subject, html, text } = body;

    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0 || recipients.length > 10) {
      return res.status(400).json({ error: 'Provide between 1 and 10 recipients.' });
    }
    for (const recipient of recipients) {
      if (typeof recipient !== 'string' || !EMAIL_PATTERN.test(recipient.trim()) || recipient.length > 254) {
        return res.status(400).json({ error: 'Invalid recipient address.' });
      }
    }

    if (typeof subject !== 'string' || !subject.trim() || subject.length > 200) {
      return res.status(400).json({ error: 'Invalid email subject.' });
    }
    if (typeof html !== 'string' || html.length === 0 || html.length > 200_000) {
      return res.status(400).json({ error: 'Invalid email HTML body.' });
    }
    if (text !== undefined && (typeof text !== 'string' || text.length > 100_000)) {
      return res.status(400).json({ error: 'Invalid email text body.' });
    }

    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'false' ? false : port === 465;

    if (!user || !pass) {
      return res.status(503).json({ error: 'Email relay SMTP credentials are not configured.' });
    }

    const emailFrom = process.env.EMAIL_FROM || `"BotBounty" <${user}>`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000
    });

    const info = await transporter.sendMail({
      from: emailFrom,
      to: recipients.map(recipient => recipient.trim()).join(', '),
      subject: subject.replace(/[\r\n]+/g, ' '),
      html,
      text: text || html.replace(/<[^>]+>/g, ' ')
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('[BotBounty Email Relay Error]:', error.message);
    return res.status(500).json({ error: 'Failed to dispatch email via relay' });
  }
}
