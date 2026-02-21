const SHEET_ID = '1r4PNxEu-ih_iLgbtE79L5_e9AsoowMWzdmpCBISqPrQ';

async function refreshAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const accessToken = await refreshAccessToken();
    const timestamp = new Date().toISOString();

    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Leads!A:C:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[timestamp, name, email]],
        }),
      }
    );

    if (!sheetsRes.ok) {
      const err = await sheetsRes.text();
      console.error('Sheets API error:', err);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
