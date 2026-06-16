# Game Store UPI - Cross-device access (demo)

This is a small **frontend + backend** demo app.
- Users choose a game (GTA 5, Red Dead Redemption 2)
- They click **Buy Now** → opens Paytm/PhonePe/Google Pay UPI intent (or falls back)
- After payment, user verifies by submitting **Txn/Reference ID** (demo)
- Access is granted across devices using the same **email**

> Important: This demo does NOT perform real payment verification. For real payments, integrate a UPI/payment gateway + webhooks.

## Files
- `server.js` - Node/Express backend (in-memory demo)
- `public/` - static frontend (index.html, verify.html, play.html)

## Run locally
1) Install dependencies:
```bash
cd game-store-upi
npm install
```
2) Start server:
```bash
npm start
```
3) Open in browser:
- http://localhost:3000/

## Notes
- Entitlements are stored in memory; restarting the server clears unlocks.
- For real cross-device persistence, use a database (Postgres/MySQL) + sessions/login.

