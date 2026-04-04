// api/send-email.js — Sends email via the Resend API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const { to, subject, body, from } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'Alterex <no-reply@alterex.app>',
      to: Array.isArray(to) ? to : [to],
      subject,
      text: body,
    }),
  });

  if (!emailRes.ok) {
    const errorText = await emailRes.text();
    console.error('Resend API error:', errorText);
    return res.status(500).json({ error: 'Email send failed', details: errorText });
  }

  const data = await emailRes.json();
  return res.json({ success: true, id: data.id });
}
