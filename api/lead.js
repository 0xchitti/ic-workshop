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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, aiLevel, background, discovery, linkedin, twitter, github } = req.body || {};

  // Required field validation
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!aiLevel) return res.status(400).json({ error: 'AI knowledge level is required' });
  if (!background) return res.status(400).json({ error: 'Background is required' });
  if (!discovery) return res.status(400).json({ error: 'Discovery source is required' });

  // Optional field validation
  if (linkedin && !/^https?:\/\//.test(linkedin)) return res.status(400).json({ error: 'LinkedIn must be a valid URL' });
  if (twitter && !/^https?:\/\//.test(twitter)) return res.status(400).json({ error: 'Twitter must be a valid URL' });
  if (github && !/^https?:\/\//.test(github)) return res.status(400).json({ error: 'GitHub must be a valid URL' });

  try {
    const accessToken = await refreshAccessToken();
    const timestamp = new Date().toISOString();

    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Leads!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            timestamp,
            name.trim(),
            email.trim(),
            aiLevel,
            background,
            discovery,
            linkedin || '',
            twitter || '',
            github || '',
          ]],
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
