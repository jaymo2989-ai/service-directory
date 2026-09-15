const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { isValidEmail, isStrongEnoughPassword, sanitizeText } = require('../utils/validators');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  const name = sanitizeText(req.body.name || '');
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!name || !isValidEmail(email) || !isStrongEnoughPassword(password)) {
    return res.status(400).json({ error: 'Please provide a valid name, email, and a password of at least 8 characters' });
  }

  const store = db.read();
  if (store.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const verificationToken = crypto.randomBytes(24).toString('hex');
  const user = {
    id: uuid(), name, email,
    password_hash: bcrypt.hashSync(password, 12),
    email_verified: false,
    verification_token: verificationToken,
    reset_token: null, reset_token_expires: null,
    notification_prefs: { email_updates: true },
    deletion_requested: false,
    status: 'active',
    created_at: new Date().toISOString()
  };
  store.users.push(user);
  db.write(store);

  await sendEmail(email, 'Verify your email', `Hi ${name}, welcome! Verify your email here: ${FRONTEND_URL}/verify-email.html?token=${verificationToken}`);

  const token = signToken(user);
  res.status(201).json({
    message: 'Account created. Check your email to verify your account.',
    token,
    user: { id: user.id, name, email, emailVerified: false }
  });
});

router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const store = db.read();
  const user = store.users.find(u => u.verification_token === token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });

  user.email_verified = true;
  user.verification_token = null;
  db.write(store);
  res.json({ message: 'Email verified successfully' });
});

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const store = db.read();
  const user = store.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, emailVerified: !!user.email_verified } });
});

router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const store = db.read();
  const user = store.users.find(u => u.email === email);

  if (user) {
    const resetToken = crypto.randomBytes(24).toString('hex');
    user.reset_token = resetToken;
    user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.write(store);
    await sendEmail(email, 'Reset your password', `Hi ${user.name}, reset your password here: ${FRONTEND_URL}/reset-password.html?token=${resetToken}\nThis link expires in 1 hour.`);
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !isStrongEnoughPassword(newPassword)) {
    return res.status(400).json({ error: 'A valid token and a password of at least 8 characters are required' });
  }

  const store = db.read();
  const user = store.users.find(u => u.reset_token === token);
  if (!user || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  }

  user.password_hash = bcrypt.hashSync(newPassword, 12);
  user.reset_token = null;
  user.reset_token_expires = null;
  db.write(store);
  res.json({ message: 'Password updated. You can now log in.' });
});

router.get('/me', requireAuth, (req, res) => {
  const store = db.read();
  const user = store.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, verification_token, reset_token, reset_token_expires, ...safe } = user;
  res.json(safe);
});

router.patch('/me', requireAuth, (req, res) => {
  const store = db.read();
  const user = store.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.body.name) user.name = sanitizeText(req.body.name);
  if (req.body.notificationPrefs) user.notification_prefs = req.body.notificationPrefs;
  db.write(store);
  res.json({ message: 'Profile updated' });
});

router.delete('/me', requireAuth, (req, res) => {
  const store = db.read();
  const user = store.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.deletion_requested = true;
  db.write(store);
  res.json({ message: 'Deletion requested. An admin will process this shortly.' });
});

module.exports = router;
