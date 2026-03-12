export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BASE_ID      = 'appEjf5vskmYJy4kg';
  const TABLE_NAME   = 'Bookings';
  const EMAIL_FIELD  = 'Family Email';
  const STRIPE_FIELD = 'Stripe URL';

  const { email: rawEmail } = req.query;

  if (!rawEmail) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const email = decodeURIComponent(rawEmail);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const filter = encodeURIComponent(`{${EMAIL_FIELD}} = "${email}"`);
    const url    = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${filter}&maxRecords=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Airtable error:', response.status, errText);
      return res.status(502).json({ error: 'Failed to reach Airtable', details: errText });
    }

    const data      = await response.json();
    const record    = data.records?.[0];
    const stripeUrl = record?.fields?.[STRIPE_FIELD] || null;

    return res.status(200).json({ stripeUrl });

  } catch (err) {
    console.error('Proxy error:', err.toString());
    return res.status(500).json({ error: 'Internal server error', details: err.toString() });
  }
}
