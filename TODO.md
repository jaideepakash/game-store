# TODO - Game Store UPI (cross-device access)

- [ ] Create project folder structure (HTML/CSS/JS + backend)
- [ ] Implement frontend landing page with game cards/logos and price ₹200 for GTA 5
- [ ] Implement UPI deep-link redirect on “Buy Now”
- [ ] Implement backend server:
  - [ ] Endpoint to create purchase/invoice record (orderId)
  - [ ] Endpoint to verify payment (needs user-provided txn id for demo)
  - [ ] Endpoint to grant entitlement to user/email across devices
- [ ] Implement user identity:
  - [ ] Simple login (email) to bind entitlements across devices
- [ ] Implement “Play” page that checks entitlement from backend
- [ ] Provide local run instructions (Node.js)
- [ ] Test flow end-to-end (browse -> buy -> verify -> play)

