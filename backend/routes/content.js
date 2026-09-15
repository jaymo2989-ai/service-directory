const express = require('express');
const db = require('../db/init');

const router = express.Router();

router.get('/faqs', (req, res) => {
  const store = db.read();
  res.json(store.faqs.slice().sort((a, b) => a.sort_order - b.sort_order).map(f => ({ id: f.id, question: f.question, answer: f.answer })));
});

router.get('/announcement', (req, res) => {
  const store = db.read();
  const active = store.announcements.filter(a => a.active).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  res.json(active ? { text: active.text } : null);
});

router.get('/owner', (req, res) => {
  res.json({
    name: process.env.OWNER_NAME || '',
    phone: process.env.OWNER_PHONE || '',
    email: process.env.OWNER_EMAIL || ''
  });
});

module.exports = router;
