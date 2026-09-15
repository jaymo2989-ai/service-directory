const rateLimit = require('express-rate-limit');

/** Generic strict limiter for auth endpoints — slows down brute force / bot signups. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** Limits how often inquiries/quote requests/reviews can be submitted — spam prevention. */
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions from this connection. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

/** Loose general limiter applied to the whole API as a baseline. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, submissionLimiter, generalLimiter };
