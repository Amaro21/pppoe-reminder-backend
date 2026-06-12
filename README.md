# PPPoE Reminder — Backend

A tiny Express server that acts as a proxy between your PWA and SMS API PH.
Solves the CORS issue when calling SMS API PH from a browser.

## How it works

```
Your Phone App  →  This Backend (Render)  →  SMS API PH  →  Subscriber's Phone
```

---

## Deploy to Render (Free) — Step by Step

### Step 1 — Upload to GitHub
1. Go to **github.com** and sign in (or sign up free)
2. Click **"New repository"**
3. Name it `pppoe-reminder-backend`
4. Set it to **Public**, click **Create repository**
5. Upload all files from this folder (server.js, package.json, render.yaml, .gitignore)
   - Click **"uploading an existing file"**
   - Drag and drop all files → click **Commit changes**

### Step 2 — Deploy on Render
1. Go to **render.com** and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your `pppoe-reminder-backend` GitHub repo
4. Render auto-detects the settings from render.yaml. Just confirm:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **"Create Web Service"**

### Step 3 — Add your SMS API PH key
1. In Render dashboard, go to your service → **"Environment"**
2. Add these environment variables:
   - Key: `SMS_API_KEY` → Value: `sk-your-actual-key-here`
   - Key: `ALLOWED_ORIGIN` → Value: `https://your-app.netlify.app`
3. Click **Save** — Render will redeploy automatically

### Step 4 — Get your backend URL
After deploy, Render gives you a URL like:
`https://pppoe-reminder-backend.onrender.com`

Copy this URL — you'll paste it into your phone app Settings.

---

## API Endpoints

### POST /send-sms
Send an SMS to a subscriber.
```json
{ "to": "09XXXXXXXXX", "message": "Your message here" }
```
Response: `{ "ok": true }`

### GET /test-key
Test if your SMS_API_KEY is valid.
Response: `{ "ok": true, "message": "API key is valid" }`

### GET /
Health check.
Response: `{ "status": "PPPoE Reminder backend running" }`

---

## Notes
- Free Render services sleep after 15 minutes of inactivity
- First request after sleeping takes ~30 seconds (cold start)
- For a small ISP this is fine — the scheduler wakes it up daily
- Upgrade to Render's $7/month plan if you need it always-on
