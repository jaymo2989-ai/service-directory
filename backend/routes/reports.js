const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { optionalAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/validators');

const router = express.Router();

router.post('/', optionalAuth, (req, res) => {
  const { targetType, targetId, reason, contact } = req.body;
  if (!['provider', 'review'].includes(targetType) || !targetId || !reason) {
    return res.status(400).json({ error: 'targetType (provider/review), targetId, and reason are required' });
  }

  const store = db.read();
  const exists = targetType === 'provider'
    ? store.providers.find(p => p.id === targetId)
    : store.reviews.find(r => r.id === targetId);
  if (!exists) return res.status(404).json({ error: `${targetType} not found` });

  store.reports.push({
    id: uuid(), reporter_user_id: req.user ? req.user.id : null, reporter_contact: sanitizeText(contact || ''),
    target_type: targetType, target_id: targetId, reason: sanitizeText(reason),
    status: 'open', created_at: new Date().toISOString()
  });

  if (targetType === 'review') exists.status = 'flagged';

  db.write(store);
  res.status(201).json({ message: 'Report submitted. Thank you — our team will review it.' });
});

module.exports = router;
