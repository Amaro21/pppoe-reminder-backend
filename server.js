const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMS_API_KEY; // your sk- key stored in Render env vars

app.use(express.json());

// Allow requests from your Netlify app URL
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running' });
});

// Send SMS endpoint
// POST /send-sms  { to: '09XXXXXXXXX', message: '...' }
app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;

  // Basic validation
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Missing to or message' });
  }
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: 'SMS_API_KEY not configured on server' });
  }

  // Format phone number to +63 format
  let phone = String(to).replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '63' + phone.slice(1);
  if (!phone.startsWith('63')) phone = '63' + phone;
  phone = '+' + phone;

  try {
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ to: phone, message })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log(`[OK] SMS sent to ${phone}`);
      return res.json({ ok: true, data });
    } else {
      console.error(`[FAIL] ${phone} — ${response.status}`, data);
      return res.status(response.status).json({ ok: false, error: data.message || 'SMS API PH error', status: response.status });
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Test API key endpoint
app.get('/test-key', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: 'SMS_API_KEY not set' });
  }
  try {
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ to: '+639000000000', message: 'test' })
    });
    // 401 = bad key, anything else = key is accepted
    if (response.status === 401) {
      return res.status(401).json({ ok: false, error: 'Invalid API key' });
    }
    return res.json({ ok: true, message: 'API key is valid' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPPoE backend listening on port ${PORT}`);
});
