(() => {
    const UPI_NUMBER = '9290860080';
    const BUSINESS_NAME = 'Game Store';

    function upiDeepLink({ app, payee, amount, currency = 'INR', orderId, note }) {
        const params = new URLSearchParams({
            pa: payee,
            pn: BUSINESS_NAME,
            am: amount,
            cu: currency,
            tn: note || `Order ${orderId}`,
            tr: orderId,
        });

        // Generic UPI deep link. Many UPI apps parse it if opened as an intent.
        const upiUri = `upi://pay?${params.toString()}`;

        // Android intents for popular apps (works on Android).
        // On desktop/mobile without intent support, opening upi://pay may be ignored.
        if (app === 'phonepe') {
            return `intent://pay?${params.toString()}#Intent;scheme=upi;package=com.phonepe.app;end`;
        }
        if (app === 'paytm') {
            return `intent://pay?${params.toString()}#Intent;scheme=upi;package=net.one97.paytm;end`;
        }
        if (app === 'gpay') {
            // Google Pay package name varies by device; com.google.android.apps.nbu.paisa.user
            return `intent://pay?${params.toString()}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        }

        return upiUri;
    }

    function detectAppPriority() {
        // If you want you can customize this based on user agent.
        // We will try a generic UPI link first; then user can open it in their UPI app.
        return ['phonepe', 'paytm', 'gpay', 'generic'];
    }

    function bestEffortRedirect(urls) {
        // Attempt redirect in a way that works on many browsers.
        // If intent fails, we still move user to verification page.
        const first = urls[0];
        window.location.href = first;

        // Fallback: user proceeds to verify page after a few seconds.
        setTimeout(() => {
            try {
                const v = new URL('/verify.html', window.location.origin);
                v.searchParams.set('orderId', window.__currentOrderId || '');
                window.location.href = v.toString();
            } catch (_) { }
        }, 1800);
    }

    async function createOrder(gameId, amount, email) {
        const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, price: amount, email }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Failed to create order');
        return data.orderId;
    }

    function wireIndex() {
        document.querySelectorAll('[data-game-id]').forEach(card => {
            const gameId = card.getAttribute('data-game-id');
            const buyBtn = card.querySelector('.buy-btn');
            const priceValueEl = card.querySelector('.price-value');
            const price = Number(priceValueEl?.textContent?.trim() || '200');

            if (!buyBtn) return;

            buyBtn.addEventListener('click', async () => {
                const email = (document.getElementById('email')?.value || '').trim();
                if (!email) {
                    alert('Enter your email to enable cross-device access.');
                    return;
                }

                try {
                    const orderId = await createOrder(gameId, price, email);
                    window.__currentOrderId = orderId;

                    const note = `Game Purchase - ${gameId}`;
                    const urls = detectAppPriority().map(app =>
                        upiDeepLink({
                            app,
                            payee: UPI_NUMBER,
                            amount: String(price),
                            orderId,
                            note,
                        })
                    );

                    // Send user to UPI payment app
                    bestEffortRedirect(urls);

                    // also store order for verification step
                    const v = new URL('/verify.html', window.location.origin);
                    v.searchParams.set('orderId', orderId);
                    localStorage.setItem('pendingOrderId', orderId);
                    // verify.html will read query/localStorage
                    setTimeout(() => {
                        window.location.href = v.toString();
                    }, 350);
                } catch (e) {
                    alert(e.message || 'Something went wrong');
                }
            });
        });
    }

    function wireVerify() {
        const orderId = new URLSearchParams(window.location.search).get('orderId') || localStorage.getItem('pendingOrderId');

        const el = (id) => document.getElementById(id);
        const orderEl = el('orderId');
        const emailEl = el('email');
        const txnEl = el('txnId');
        const btn = el('verifyBtn');
        const status = el('status');
        const playBtn = el('playBtn');

        if (!btn) return;

        if (orderEl) orderEl.textContent = orderId || '(missing)';

        btn.addEventListener('click', async () => {
            status.textContent = 'Verifying...';
            status.style.color = '';
            playBtn.style.display = 'none';

            const txnId = (txnEl?.value || '').trim();
            const email = (emailEl?.value || '').trim();

            if (!orderId) {
                status.textContent = 'Missing orderId. Go back and try again.';
                status.style.color = 'var(--danger)';
                return;
            }
            if (!txnId) {
                status.textContent = 'Enter Txn/Reference ID.';
                status.style.color = 'var(--danger)';
                return;
            }
            if (!email) {
                status.textContent = 'Enter email used during checkout.';
                status.style.color = 'var(--danger)';
                return;
            }

            const res = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, txnId, email }),
            });
            const data = await res.json();

            if (!data.ok) {
                status.textContent = data.error || 'Verification failed.';
                status.style.color = 'var(--danger)';
                return;
            }

            status.textContent = 'Payment verified (demo). Your access is ready!';
            status.style.color = 'var(--primary2)';
            playBtn.style.display = 'block';
        });

        playBtn.addEventListener('click', () => {
            window.location.href = '/play.html';
        });
    }

    function wirePlay() {
        const email = (document.getElementById('playEmail')?.value || '').trim();
        const list = document.getElementById('gameList');
        const btn = document.getElementById('loadBtn');
        const status = document.getElementById('playStatus');

        if (!btn) return;

        btn.addEventListener('click', async () => {
            status.textContent = 'Loading...';
            status.style.color = '';
            list.innerHTML = '';

            const res = await fetch(`/api/my-games?email=${encodeURIComponent((document.getElementById('playEmail').value || '').trim())}`);
            const data = await res.json();
            if (!data.ok) {
                status.textContent = data.error || 'Failed';
                status.style.color = 'var(--danger)';
                return;
            }

            const games = data.games || [];
            if (!games.length) {
                list.innerHTML = '<tr><td colspan="2">No games unlocked yet.</td></tr>';
                status.textContent = 'Nothing found.';
                status.style.color = 'var(--muted)';
                return;
            }

            list.innerHTML = games
                .map(g => `<tr><td>${escapeHtml(g)}</td><td><span class="badge">Unlocked</span></td></tr>`)
                .join('');
            status.textContent = 'Access confirmed.';
            status.style.color = 'var(--primary2)';
        });

        function escapeHtml(s) {
            return String(s)
                .replaceAll('&', '&amp;')
                .replaceAll('<', '<')
                .replaceAll('>', '>')
                .replaceAll('"', '"')
                .replaceAll("'", '&#039;');
        }
    }

    // Route wiring
    const p = location.pathname;
    if (p.endsWith('/index.html') || p === '/' || p.endsWith('index.html')) wireIndex();
    else if (p.endsWith('/verify.html')) wireVerify();
    else if (p.endsWith('/play.html')) wirePlay();
})();

