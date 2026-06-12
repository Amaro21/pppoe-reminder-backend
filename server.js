const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMS_API_KEY;

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running', provider: 'SMS API PH' });
});

// Format to E.164 — +639XXXXXXXXX
function formatPhone(raw) {
  let num = String(raw).replace(/\D/g, '');
  if (num.startsWith('0')) num = '63' + num.slice(1);
  if (!num.startsWith('63')) num = '63' + num;
  return '+' + num;
}

// POST /send-sms  { to: '09XXXXXXXXX', message: '...' }
app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Missing to or message' });
  }
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: 'SMS_API_KEY not configured on server' });
  }

  const recipient = formatPhone(to);
  console.log(`[SEND] recipient=${recipient} message="${message.slice(0,40)}..."`);

  try {
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ recipient, message })
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[RESULT] status=${response.status}`, JSON.stringify(data));

    if (response.ok) {
      return res.json({ ok: true, data });
    } else {
      const errMsg = data?.error?.message || data?.message || data?.error || 'SMS API PH error';
      return res.status(response.status).json({ ok: false, error: errMsg });
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /test-key
app.get('/test-key', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: 'SMS_API_KEY not set' });
  }
  try {
    // Send to a valid-format test number — 401 = bad key, 4xx other = key works
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ recipient: '+639170000000', message: 'test' })
    });
    const data = await response.json().catch(() => ({}));
    console.log(`[TEST] status=${response.status}`, JSON.stringify(data));

    if (response.status === 401) {
      return res.status(401).json({ ok: false, error: 'Invalid API key' });
    }
    // Any non-401 response means key is accepted
    return res.json({ ok: true, message: 'API key valid!', apiResponse: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPPoE backend (SMS API PH) on port ${PORT}`);
});
