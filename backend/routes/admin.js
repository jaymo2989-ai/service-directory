const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db/init');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sanitizeText, isValidKenyanPhone } = require('../utils/validators');

const router = express.Router();

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const store = db.read();
  const admin = store.admins.find(a => a.email === email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.ADMIN_JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

router.use(requireAdmin);

// ---------- Stats ----------
router.get('/stats', (req, res) => {
  const store = db.read();
  const totalProviders = store.providers.filter(p => p.status === 'approved').length;
  const pendingReports = store.reports.filter(r => r.status === 'open').length;
  const flaggedReviews = store.reviews.filter(r => r.status === 'flagged').length;
  const totalCustomers = store.users.filter(u => u.status === 'active').length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const inquiriesThisWeek = store.inquiries.filter(i => new Date(i.created_at).getTime() >= weekAgo).length;
  const featuredCount = store.providers.filter(p => p.featured).length;
  const deletionRequests = store.users.filter(u => u.deletion_requested).length;

  const topCategories = store.categories.map(c => ({
    name: c.name,
    count: store.providers.filter(p => p.category_id === c.id && p.status === 'approved').length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  res.json({
    totalProviders, pendingReports, flaggedReviews, totalCustomers,
    inquiriesThisWeek, featuredCount, topCategories, deletionRequests,
    capacity: { providers: `${totalProviders} / 600` }
  });
});

// ---------- Providers ----------
router.get('/providers', (req, res) => {
  const store = db.read();
  const { status } = req.query;
  let rows = status ? store.providers.filter(p => p.status === status) : store.providers;
  rows = rows.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(p => {
    const cat = store.categories.find(c => c.id === p.category_id);
    return { ...p, category_name: cat ? cat.name : '' };
  });
  res.json(rows);
});

router.post('/providers', upload.single('image'), (req, res) => {
  const store = db.read();
  const activeCount = store.providers.filter(p => p.status !== 'removed').length;
  if (activeCount >= 600) {
    return res.status(400).json({ error: 'Directory is at its 600-provider capacity. Remove an inactive listing before adding a new one.' });
  }

  const { name, categoryId, bio, locationTown, locationEstate, serviceArea, phone, whatsapp, email, priceMin, priceMax, hoursNote } = req.body;
  if (!name || !categoryId || !locationTown || !phone) {
    return res.status(400).json({ error: 'name, categoryId, locationTown, and phone are required' });
  }
  if (whatsapp && !isValidKenyanPhone(whatsapp)) {
    return res.status(400).json({ error: 'WhatsApp number must be in the format 2547XXXXXXXX' });
  }
  if (!store.categories.find(c => c.id === categoryId)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  let daysAvailable = [];
  try { daysAvailable = JSON.parse(req.body.daysAvailable || '[]'); } catch { /* defaults to [] */ }

  const provider = {
    id: uuid(), name: sanitizeText(name), category_id: categoryId, bio: sanitizeText(bio || ''),
    location_town: sanitizeText(locationTown), location_estate: sanitizeText(locationEstate || ''),
    service_area: sanitizeText(serviceArea || ''), phone, whatsapp: whatsapp || null, email: email || null,
    price_min: priceMin ? Number(priceMin) : null, price_max: priceMax ? Number(priceMax) : null,
    days_available: daysAvailable, hours_note: sanitizeText(hoursNote || ''),
    image_url: req.file ? `/uploads/${req.file.filename}` : null,
    verified: !!req.body.verified, featured: !!req.body.featured, status: 'approved',
    rating_avg: 0, rating_count: 0,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  store.providers.push(provider);
  db.write(store);
  res.status(201).json({ message: 'Provider listed', id: provider.id });
});

router.patch('/providers/:id', upload.single('image'), (req, res) => {
  const store = db.read();
  const provider = store.providers.find(p => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const textFields = {
    name: 'name', bio: 'bio', locationTown: 'location_town', locationEstate: 'location_estate',
    serviceArea: 'service_area', phone: 'phone', whatsapp: 'whatsapp', email: 'email', hoursNote: 'hours_note'
  };
  for (const [bodyKey, col] of Object.entries(textFields)) {
    if (req.body[bodyKey] !== undefined) provider[col] = sanitizeText(req.body[bodyKey]);
  }
  if (req.body.categoryId !== undefined) provider.category_id = req.body.categoryId;
  if (req.body.priceMin !== undefined) provider.price_min = req.body.priceMin ? Number(req.body.priceMin) : null;
  if (req.body.priceMax !== undefined) provider.price_max = req.body.priceMax ? Number(req.body.priceMax) : null;
  if (req.body.daysAvailable !== undefined) {
    try { provider.days_available = JSON.parse(req.body.daysAvailable); } catch { /* keep existing on parse failure */ }
  }
  if (req.body.status !== undefined) provider.status = req.body.status;
  if (req.body.featured !== undefined) provider.featured = !!req.body.featured && req.body.featured !== 'false';
  if (req.body.verified !== undefined) provider.verified = !!req.body.verified && req.body.verified !== 'false';
  if (req.file) provider.image_url = `/uploads/${req.file.filename}`;
  provider.updated_at = new Date().toISOString();

  db.write(store);
  res.json({ message: 'Provider updated' });
});

router.delete('/providers/:id', (req, res) => {
  const store = db.read();
  const provider = store.providers.find(p => p.id === req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  provider.status = 'removed';
  db.write(store);
  res.json({ message: 'Provider removed' });
});

// ---------- Categories ----------
router.post('/categories', (req, res) => {
  const store = db.read();
  if (store.categories.length >= 50) return res.status(400).json({ error: 'Category limit (50) reached' });

  const { name, icon, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const maxOrder = store.categories.reduce((m, c) => Math.max(m, c.sort_order || 0), 0);
  const category = { id: uuid(), name: sanitizeText(name), slug, icon: icon || 'tool', parent_id: parentId || null, sort_order: maxOrder + 1, created_at: new Date().toISOString() };
  store.categories.push(category);
  db.write(store);
  res.status(201).json({ message: 'Category created', id: category.id, slug });
});

router.patch('/categories/:id', (req, res) => {
  const store = db.read();
  const category = store.categories.find(c => c.id === req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  if (req.body.name) category.name = sanitizeText(req.body.name);
  if (req.body.icon) category.icon = req.body.icon;
  if (req.body.sortOrder !== undefined) category.sort_order = req.body.sortOrder;
  db.write(store);
  res.json({ message: 'Category updated' });
});

router.delete('/categories/:id', (req, res) => {
  const store = db.read();
  const inUse = store.providers.filter(p => p.category_id === req.params.id).length;
  if (inUse > 0) return res.status(400).json({ error: `Cannot delete — ${inUse} provider(s) still use this category` });
  store.categories = store.categories.filter(c => c.id !== req.params.id);
  db.write(store);
  res.json({ message: 'Category deleted' });
});

// ---------- Reviews ----------
router.get('/reviews', (req, res) => {
  const store = db.read();
  const { status } = req.query;
  let rows = status ? store.reviews.filter(r => r.status === status) : store.reviews;
  rows = rows.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(r => {
    const user = store.users.find(u => u.id === r.user_id);
    const provider = store.providers.find(p => p.id === r.provider_id);
    return { ...r, reviewer_name: user ? user.name : 'Former user', provider_name: provider ? provider.name : 'Removed listing' };
  });
  res.json(rows);
});

router.patch('/reviews/:id', (req, res) => {
  const { status } = req.body;
  if (!['published', 'removed', 'flagged'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const store = db.read();
  const review = store.reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.status = status;

  const published = store.reviews.filter(r => r.provider_id === review.provider_id && r.status === 'published');
  const provider = store.providers.find(p => p.id === review.provider_id);
  if (provider) {
    provider.rating_count = published.length;
    provider.rating_avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0;
  }

  db.write(store);
  res.json({ message: 'Review updated' });
});

router.post('/reviews/:id/response', (req, res) => {
  const { response } = req.body;
  if (!response) return res.status(400).json({ error: 'response text required' });
  const store = db.read();
  const review = store.reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.provider_response = sanitizeText(response);
  db.write(store);
  res.json({ message: 'Response posted' });
});

// ---------- Reports ----------
router.get('/reports', (req, res) => {
  const store = db.read();
  const { status } = req.query;
  const rows = (status ? store.reports.filter(r => r.status === status) : store.reports)
    .slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(rows);
});

router.patch('/reports/:id', (req, res) => {
  const store = db.read();
  const report = store.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.status = req.body.status;
  db.write(store);
  res.json({ message: 'Report updated' });
});

// ---------- Inquiries ----------
router.get('/inquiries', (req, res) => {
  const store = db.read();
  const rows = store.inquiries
    .slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 500)
    .map(i => {
      const provider = store.providers.find(p => p.id === i.provider_id);
      return { ...i, provider_name: provider ? provider.name : 'Removed listing' };
    });
  res.json(rows);
});

router.patch('/inquiries/:id', (req, res) => {
  const store = db.read();
  const inquiry = store.inquiries.find(i => i.id === req.params.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  inquiry.status = req.body.status;
  db.write(store);
  res.json({ message: 'Updated' });
});

// ---------- Users ----------
router.get('/users', (req, res) => {
  const store = db.read();
  const rows = store.users.map(({ password_hash, verification_token, reset_token, reset_token_expires, ...safe }) => safe);
  res.json(rows);
});

router.patch('/users/:id', (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const store = db.read();
  const user = store.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = status;
  db.write(store);
  res.json({ message: 'User updated' });
});

router.delete('/users/:id', (req, res) => {
  const store = db.read();
  store.users = store.users.filter(u => u.id !== req.params.id);
  db.write(store);
  res.json({ message: 'User deleted' });
});

// ---------- FAQs & announcements ----------
router.post('/faqs', (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
  const store = db.read();
  const maxOrder = store.faqs.reduce((m, f) => Math.max(m, f.sort_order || 0), 0);
  store.faqs.push({ id: uuid(), question: sanitizeText(question), answer: sanitizeText(answer), sort_order: maxOrder + 1 });
  db.write(store);
  res.status(201).json({ message: 'FAQ added' });
});

router.delete('/faqs/:id', (req, res) => {
  const store = db.read();
  store.faqs = store.faqs.filter(f => f.id !== req.params.id);
  db.write(store);
  res.json({ message: 'FAQ deleted' });
});

router.post('/announcements', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const store = db.read();
  store.announcements.forEach(a => { a.active = false; });
  store.announcements.push({ id: uuid(), text: sanitizeText(text), active: true, created_at: new Date().toISOString() });
  db.write(store);
  res.status(201).json({ message: 'Announcement posted' });
});

router.delete('/announcements/:id', (req, res) => {
  const store = db.read();
  const a = store.announcements.find(a => a.id === req.params.id);
  if (a) a.active = false;
  db.write(store);
  res.json({ message: 'Announcement removed' });
});

module.exports = router;
