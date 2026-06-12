const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SMS_API_KEY;

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

app.get('/', (req, res) => {
  res.json({ status: 'PPPoE Reminder backend running' });
});

function formatPhone(raw) {
  let num = String(raw).replace(/\D/g, '');
  if (num.startsWith('0')) num = '63' + num.slice(1);
  if (!num.startsWith('63')) num = '63' + num;
  return '+' + num;
}

app.post('/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ ok: false, error: 'Missing to or message' });
  if (!API_KEY) return res.status(500).json({ ok: false, error: 'SMS_API_KEY not configured' });
  const recipient = formatPhone(to);
  console.log('[SEND] recipient=' + recipient);
  try {
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ recipient: recipient, message: message })
    });
    const data = await response.json().catch(() => ({}));
    console.log('[RESULT] ' + response.status + ' ' + JSON.stringify(data));
    if (response.ok) return res.json({ ok: true, data });
    return res.status(response.status).json({ ok: false, error: data.message || data.error || 'SMS API PH error' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/test-key', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ ok: false, error: 'SMS_API_KEY not set' });
  try {
    const response = await fetch('https://smsapiph.onrender.com/api/v1/send/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ recipient: '+639170000000', message: 'test' })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) return res.status(401).json({ ok: false, error: 'Invalid API key' });
    return res.json({ ok: true, message: 'API key accepted', apiResponse: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log('PPPoE backend on port ' + PORT));
