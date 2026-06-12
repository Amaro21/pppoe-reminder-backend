const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// smsgateway.me credentials
const DEVICE_ID = process.env.DEVICE_ID;   // your Android device ID from smsgateway.me
const EMAIL = process.env.SMS_EMAIL;        // your smsgateway.me email
const PASSWORD = process.env.SMS_PASSWORD;  // your smsgateway.me password

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running', provider: 'smsgateway.me (your own SIM)' });
});

// Format to +639XXXXXXXXX
function formatPhone(raw) {
  let num = String(raw).replace(/\D/g, '');
  if (num.startsWith('0')) num = '63' + num.slice(1);
  if (!num.startsWith('63')) num = '63' + num;
  return '+' + num;
}

// Basic auth header for smsgateway.me
function authHeader() {
  const encoded = Buffer.from(`${EMAIL}:${PASSWORD}`).toString('base64');
  return `Basic ${encoded}`;
}

// POST /send-sms  { to: '09XXXXXXXXX', message: '...' }
app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Missing to or message' });
  }
  if (!EMAIL || !PASSWORD) {
    return res.status(500).json({ ok: false, error: 'SMS_EMAIL or SMS_PASSWORD not configured' });
  }

  const phone = formatPhone(to);
  console.log(`[SEND] to=${phone}`);

  try {
    const body = {
      message,
      phoneNumbers: [phone]
    };
    // Optionally target a specific device
    if (DEVICE_ID) body.deviceId = DEVICE_ID;

    const response = await fetch('https://smsgateway.me/api/v4/message/send', {
      method: 'POST',
      headers: {
        'Authorization': authHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    console.log(`[RESULT] status=${response.status}`, JSON.stringify(data));

    if (response.ok) {
      return res.json({ ok: true, data });
    } else {
      return res.status(response.status).json({
        ok: false,
        error: data.message || data.error || 'smsgateway.me error'
      });
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /test-key — verify credentials and get device list
app.get('/test-key', async (req, res) => {
  if (!EMAIL || !PASSWORD) {
    return res.status(500).json({ ok: false, error: 'SMS_EMAIL or SMS_PASSWORD not set' });
  }
  try {
    const response = await fetch('https://smsgateway.me/api/v4/device?page=1', {
      headers: { 'Authorization': authHeader() }
    });
    const data = await response.json().catch(() => ({}));
    console.log(`[TEST] status=${response.status}`, JSON.stringify(data));

    if (response.ok) {
      const devices = data.results || data || [];
      const count = Array.isArray(devices) ? devices.length : 0;
      const names = Array.isArray(devices) ? devices.map(d => d.name || d.model).join(', ') : '';
      return res.json({
        ok: true,
        message: `Connected! ${count} device(s) found`,
        devices: names
      });
    } else {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PPPoE backend (smsgateway.me) on port ${PORT}`);
});
