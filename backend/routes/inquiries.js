const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { sanitizeText, isValidEmail } = require('../utils/validators');

const router = express.Router();

router.post('/providers/:providerId/inquiries', optionalAuth, (req, res) => {
  const store = db.read();
  const provider = store.providers.find(p => p.id === req.params.providerId && p.status === 'approved');
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const type = ['quote_request', 'call_click', 'whatsapp_click', 'message'].includes(req.body.type) ? req.body.type : 'quote_request';
  const message = sanitizeText(req.body.message || '');
  const guestName = sanitizeText(req.body.guestName || '');
  const guestPhone = sanitizeText(req.body.guestPhone || '');
  const guestEmail = req.body.guestEmail || '';

  if (type === 'quote_request' && !req.user && (!guestName || !guestPhone)) {
    return res.status(400).json({ error: 'Please provide your name and phone number so the provider can reach you' });
  }
  if (guestEmail && !isValidEmail(guestEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email or leave it blank' });
  }

  const inquiry = {
    id: uuid(), provider_id: req.params.providerId, user_id: req.user ? req.user.id : null,
    guest_name: guestName, guest_phone: guestPhone, guest_email: guestEmail,
    message, type, status: 'new', created_at: new Date().toISOString()
  };
  store.inquiries.push(inquiry);
  db.write(store);

  const response = { id: inquiry.id, message: 'Inquiry recorded' };
  if (provider.whatsapp) {
    const text = encodeURIComponent(`Hi ${provider.name}, I found you on the directory.\n${message}`);
    response.whatsappUrl = `https://wa.me/${provider.whatsapp}?text=${text}`;
  }
  response.callUrl = `tel:${provider.phone}`;
  res.status(201).json(response);
});

router.get('/mine', requireAuth, (req, res) => {
  const store = db.read();
  const rows = store.inquiries
    .filter(i => i.user_id === req.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(i => {
      const provider = store.providers.find(p => p.id === i.provider_id);
      return { ...i, provider_name: provider ? provider.name : 'Removed listing', provider_image: provider ? provider.image_url : null };
    });
  res.json(rows);
});

module.exports = router;
