const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMS_API_KEY; // UniSMS secret key (sk_XXXXXXXX)

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running', provider: 'UniSMS PH' });
});

// Format to E.164 +639XXXXXXXXX
function formatPhone(raw) {
  let num = String(raw).replace(/\D/g, '');
  if (num.startsWith('0')) num = '63' + num.slice(1);
  if (!num.startsWith('63')) num = '63' + num;
  return '+' + num;
}

// Basic auth — API key as username, empty password
function authHeader() {
  const encoded = Buffer.from(`${API_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
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

  const recipient = formatPhone(to);
  console.log(`[SEND] recipient=${recipient}`);

  try {
    // UniSMS max 160 chars per SMS
    const content = message.length > 160 ? message.slice(0, 157) + '...' : message;
    console.log(`[SEND] content length=${content.length}`);

    const response = await fetch('https://unismsapi.com/api/sms', {
      method: 'POST',
      headers: {
        'Authorization': authHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient, content })
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[RESULT] status=${response.status}`, JSON.stringify(data));

    // UniSMS returns 201 on success
    if (response.status === 201) {
      return res.json({ ok: true, data });
    } else {
      // Log full error details for debugging
      const errMsg = data?.errors?.join(', ') || data?.message || data?.error || `Error ${response.status}`;
      console.log(`[ERROR DETAIL]`, JSON.stringify(data));
      return res.status(response.status).json({ ok: false, error: errMsg, detail: data });
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /test-key — uses the /account endpoint from docs
app.get('/test-key', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ ok: false, error: 'SMS_API_KEY not set' });
  try {
    const response = await fetch('https://unismsapi.com/api/account', {
      headers: { 'Authorization': authHeader() }
    });
    const data = await response.json().catch(() => ({}));
    console.log(`[TEST] status=${response.status}`, JSON.stringify(data));

    if (response.ok) {
      return res.json({
        ok: true,
        message: `UniSMS connected! Credits: ${data.sms_credits}`,
        credits: data.sms_credits,
        email: data.email,
        status: data.status
      });
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid API key' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPPoE backend (UniSMS) on port ${PORT}`);
});
