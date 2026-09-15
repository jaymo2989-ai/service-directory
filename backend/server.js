require('dotenv').config();
require('./db/init'); // ensures tables + seed data exist before anything else runs

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { generalLimiter, authLimiter, submissionLimiter } = require('./middleware/rateLimits');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const providerRoutes = require('./routes/providers');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const inquiryRoutes = require('./routes/inquiries');
const reportRoutes = require('./routes/reports');
const contentRoutes = require('./routes/content');
const adminRoutes = require('./routes/admin');

const app = express();

// ---------- Core security & parsing middleware ----------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // allow images to load cross-origin on the frontend
}));
app.use(cors()); // in production, restrict this to your actual frontend domain
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/', generalLimiter);

// ---------- Routes ----------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api', submissionLimiter, reviewRoutes);     // /api/providers/:id/reviews, /api/reviews/:id
app.use('/api/favorites', favoriteRoutes);
app.use('/api', submissionLimiter, inquiryRoutes);     // /api/providers/:id/inquiries, /api/inquiries/mine
app.use('/api/reports', submissionLimiter, reportRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------- 404 for unmatched API routes ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ---------- Centralized error handler ----------
// Catches thrown errors (including multer upload errors) and always returns
// clean JSON instead of leaking stack traces to the client.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes('Only JPG')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Service directory API running on port ${PORT}`));
