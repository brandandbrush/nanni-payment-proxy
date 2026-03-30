export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BASE_ID      = 'appEjf5vskmYJy4kg';
  const TABLE_NAME   = 'Bookings';
  const EMAIL_FIELD  = 'Family Email';
  const STRIPE_FIELD = 'Stripe URL';

  const { email: rawEmail, record_id: recordId } = req.query;

  if (!rawEmail && !recordId) {
    return res.status(400).json({ error: 'Either email or record_id is required' });
  }

  try {
    let url;

    if (recordId) {
      // Look up directly by Airtable record ID
      if (!/^rec[a-zA-Z0-9]{14}$/.test(recordId)) {
        return res.status(400).json({ error: 'Invalid record_id format' });
      }
      console.log('Looking up by record ID:', recordId);
      url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;
    } else {
      // Look up by email, sorted by most recent booking
      const email = decodeURIComponent(rawEmail);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      console.log('Looking up by email:', email);
      const filter = encodeURIComponent(`{${EMAIL_FIELD}} = "${email}"`);
      url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`
          + `?filterByFormula=${filter}`
          + `&sort[0][field]=Request Date`
          + `&sort[0][direction]=desc`
          + `&maxRecords=1`;
    }

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

    const data = await response.json();

    // Single record lookup returns the record directly; email lookup returns a records array
    const record    = recordId ? data : data.records?.[0];
    const stripeUrl = record?.fields?.[STRIPE_FIELD] || null;

    return res.status(200).json({ stripeUrl });

  } catch (err) {
    console.error('Proxy error:', err.toString());
    return res.status(500).json({ error: 'Internal server error', details: err.toString() });
  }
}
