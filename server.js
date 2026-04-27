const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const mongoSanitize = require("@exortek/express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to Database
connectDB();

// Route files
const campgrounds = require("./routes/campgrounds");
const auth = require("./routes/auth");
const bookings = require("./routes/bookings");
const reviews = require("./routes/reviews");

const app = express();

app.set("query parser", "extended");

// Body Parser
app.use(express.json());

// Sanitize data
app.use(mongoSanitize({ allowDots: true, patterns: [/\$[\w]+/g] }));

// Cookie Parser
app.use(cookieParser());

// Set secutiry header
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate Limiting
const Limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 300,
  // Skip the limiter entirely in non-production. Dev mode + Next.js +
  // NextAuth + Playwright workers easily exceed 300/10min — and even 5000
  // gets brushed when NextAuth polls /auth/me on every navigation. The
  // limiter exists to protect the public API in production; locally it
  // just makes tests flaky for no security benefit.
  skip: () => process.env.NODE_ENV !== "production",
});
app.use(Limiter);

// Prevent http param pollutions
app.use(hpp());

// Mount routes
app.use("/api/v1/campgrounds", campgrounds);
app.use("/api/v1/auth", auth);
app.use("/api/v1/bookings", bookings);
app.use("/api/v1/reviews", reviews);

const PORT = process.env.PORT || 5000;
const server = app.listen(
  PORT,
  console.log(
    "Server running in ",
    process.env.NODE_ENV,
    " mode on port ",
    PORT,
  ),
);

// Handle unhandled promise projections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & Exit process
  server.close(() => process.exit(1));
});
