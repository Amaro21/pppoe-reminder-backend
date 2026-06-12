const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMS_API_KEY;    // InfiniReach API key (X-API-Key)
const FROM_NUMBER = process.env.FROM_NUMBER; // your phone number e.g. +639XXXXXXXXX

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running', provider: 'InfiniReach (your own SIM)' });
});

// Format to E.164 +639XXXXXXXXX
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
    return res.status(500).json({ ok: false, error: 'SMS_API_KEY not configured' });
  }
  if (!FROM_NUMBER) {
    return res.status(500).json({ ok: false, error: 'FROM_NUMBER not configured' });
  }

  const recipient = formatPhone(to);
  console.log(`[SEND] to=${recipient}`);

  try {
    const response = await fetch('https://api.infinireach.io/api/v1/messages', {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipient,
        message,
        from: FROM_NUMBER,
        channel: 'sms'
      })
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[RESULT] status=${response.status}`, JSON.stringify(data));

    if (response.ok && data.success) {
      return res.json({ ok: true, data });
    } else {
      return res.status(response.status || 400).json({
        ok: false,
        error: data.message || data.error || 'InfiniReach error'
      });
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /test-key
app.get('/test-key', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ ok: false, error: 'SMS_API_KEY not set' });
  if (!FROM_NUMBER) return res.status(500).json({ ok: false, error: 'FROM_NUMBER not set' });
  try {
    // Check recent messages to validate key
    const response = await fetch('https://api.infinireach.io/api/v1/messages?limit=1', {
      headers: { 'X-API-Key': API_KEY }
    });
    const data = await response.json().catch(() => ({}));
    console.log(`[TEST] status=${response.status}`, JSON.stringify(data));

    if (response.ok) {
      return res.json({
        ok: true,
        message: `InfiniReach connected! From: ${FROM_NUMBER}`
      });
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid API key' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPPoE backend (InfiniReach) on port ${PORT}`);
});
