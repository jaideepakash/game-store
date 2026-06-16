// Minimal cross-device demo: Node/Express + in-memory store
// NOTE: Real UPI verification requires payment gateway/webhook.
// This demo expects the user to paste Txn/Reference ID.

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// In-memory stores (resets on server restart)
const orders = new Map(); // orderId -> { email, gameId, price, status, createdAt }
const entitlements = new Map(); // email -> Set(gameId)

function ensureEmail(req, res, next) {
    const email = (req.query.email || req.body.email || '').toString().trim().toLowerCase();
    if (!email || !email.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Valid email required' });
    }
    req.email = email;
    next();
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// Create an order and return an orderId
app.post('/api/create-order', ensureEmail, (req, res) => {
    const { gameId, price } = req.body;
    if (!gameId) return res.status(400).json({ ok: false, error: 'gameId required' });
    const safePrice = Number(price);
    if (!Number.isFinite(safePrice) || safePrice <= 0) {
        return res.status(400).json({ ok: false, error: 'price required' });
    }

    const orderId = crypto.randomBytes(12).toString('hex');
    orders.set(orderId, {
        email: req.email,
        gameId,
        price: safePrice,
        status: 'CREATED',
        createdAt: Date.now(),
    });

    res.json({ ok: true, orderId });
});

// Verify payment (demo): user pastes txnId; we mark order paid.
app.post('/api/verify-payment', (req, res) => {
    const { orderId, txnId, email } = req.body;
    if (!orderId) return res.status(400).json({ ok: false, error: 'orderId required' });
    if (!txnId || String(txnId).trim().length < 6) {
        return res.status(400).json({ ok: false, error: 'txnId required' });
    }

    const order = orders.get(orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'order not found' });

    // Optional: if email is provided, ensure it matches (prevents accidental linking)
    if (email) {
        const safeEmail = String(email).trim().toLowerCase();
        if (safeEmail && safeEmail !== order.email) {
            return res.status(400).json({ ok: false, error: 'email mismatch for this order' });
        }
    }

    // Demo rule: if txnId looks plausible, mark paid
    order.status = 'PAID';
    orders.set(orderId, order);

    const set = entitlements.get(order.email) || new Set();
    set.add(order.gameId);
    entitlements.set(order.email, set);

    res.json({ ok: true });
});

// Get entitlement for an email
app.get('/api/my-games', ensureEmail, (req, res) => {
    const set = entitlements.get(req.email) || new Set();
    res.json({ ok: true, games: Array.from(set.values()) });
});

app.get('/api/order/:orderId', (req, res) => {
    const order = orders.get(req.params.orderId);
    if (!order) return res.status(404).json({ ok: false, error: 'order not found' });
    res.json({ ok: true, order });
});

app.listen(PORT, () => {
    console.log(`Game Store UPI server running on http://localhost:${PORT}`);
});

