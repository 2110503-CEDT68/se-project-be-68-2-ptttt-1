const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const campgrounds = require('./routes/campgrounds');
const auth = require('./routes/auth');
const bookings = require('./routes/bookings');

const app = express();

app.set('query parser', 'extended');

app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize({ allowDots: true, patterns: [/\$[\w]+/g] }));
app.use(helmet());
app.use(xss());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  // Skip the limiter entirely in non-production. Dev mode + Next.js +
  // NextAuth + Playwright workers easily exceed 300/10min — and even 5000
  // gets brushed when NextAuth polls /auth/me on every navigation. The
  // limiter exists to protect the public API in production; locally it
  // just makes tests flaky for no security benefit.
  skip: () => process.env.NODE_ENV !== 'production',
});
app.use(limiter);
app.use(hpp());

app.use('/api/v1/campgrounds', campgrounds);
app.use('/api/v1/auth', auth);
app.use('/api/v1/bookings', bookings);

module.exports = app;
