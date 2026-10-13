import nodemailer from 'nodemailer';

/**
 * BotBounty Vercel Serverless Email Relay
 * Dispatches high-deliverability transactional emails via Gmail SMTP over port 465 (SSL).
 * Bypasses cloud host port blocks (e.g. Render free tier) and sandbox domain restrictions.
 */
export default async function handler(req, res) {
  // CORS & Preflight headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-relay-secret, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'BotBounty Email Relay',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // Fallback to raw string
      }
    }
    body = body || {};

    // 1. Verify shared relay secret
    const secret = req.headers['x-relay-secret'] || body.secret;
    const expectedSecret = process.env.EMAIL_RELAY_SECRET || 'botbounty-relay-auth-2026';
    const legacySecret = 'arcbounty-relay-auth-2026';

    if (secret !== expectedSecret && secret !== legacySecret) {
      return res.status(401).json({ error: 'Unauthorized relay request' });
    }

    const { to, subject, html, text, auth, from, host: bodyHost, port: bodyPort, secure: bodySecure } = body;

    // 2. Resolve credentials from request auth payload or environment
    const user = auth?.user || process.env.SMTP_USER || process.env.GMAIL_USER || 'olajideabdulquadri22@gmail.com';
    const rawPass = auth?.pass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'pdkvitevvkogztxi';
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;
    const host = bodyHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(bodyPort || process.env.SMTP_PORT || '465', 10);
    const secure = bodySecure !== undefined ? bodySecure : (process.env.SMTP_SECURE === 'false' ? false : port === 465);

    if (!user || !pass) {
      return res.status(500).json({
        error: 'Missing SMTP credentials. Please configure SMTP_USER and SMTP_PASS.'
      });
    }

    const recipients = Array.isArray(to) ? to : [to];

    // 3. Create high-speed SSL transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000
    });

    const emailFrom = from || process.env.EMAIL_FROM || `"BotBounty" <${user}>`;

    // 4. Send email
    const info = await transporter.sendMail({
      from: emailFrom,
      to: recipients.join(', '),
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ')
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
      deliveryMethod: 'vercel-smtp-ssl-relay'
    });
  } catch (error) {
    console.error('[BotBounty Email Relay Error]:', error);
    return res.status(500).json({
      error: 'Failed to dispatch email via relay',
      details: error.message
    });
  }
}
