export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BASE_ID      = 'appEjf5vskmYJy4kg';
  const TABLE_NAME   = 'Bookings';
  const STRIPE_FIELD = 'Stripe URL';

  const { record_id: recordId } = req.query;

  if (!recordId) {
    return res.status(400).json({ error: 'record_id is required' });
  }

  // Airtable record IDs always start with 'rec' and are 17 chars
  if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId)) {
    return res.status(400).json({ error: 'Invalid record_id format' });
  }

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Airtable error:', response.status, errText);
      return res.status(502).json({ error: 'Failed to reach Airtable', details: errText });
    }

    const record    = await response.json();
    const stripeUrl = record?.fields?.[STRIPE_FIELD] || null;

    return res.status(200).json({ stripeUrl });

  } catch (err) {
    console.error('Proxy error:', err.toString());
    return res.status(500).json({ error: 'Internal server error', details: err.toString() });
  }
}
