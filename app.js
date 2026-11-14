const config = require("./config");
const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const compression = require("compression");
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const memorialRoutes = require("./routes/memorialRoutes");
const publicRoutes = require("./routes/publicRoutes");
const { exposeCsrfToken } = require("./middleware/csrf");
const { notFound, errorHandler } = require("./middleware/errorHandlers");
const { formatDate } = require("./utils/dates");
const connectDB = require("./config/db");

const app = express();

app.set("trust proxy", config.trustProxy);

// View engine
// Named outright, not left for Express to look up, so hosts that trace
// dependencies (Vercel) know to include it
app.engine("ejs", require("ejs").__express);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.locals.contactEmail = config.contactEmail;
app.locals.formatDate = formatDate;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    strictTransportSecurity: config.isProduction,
  }),
);
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// On a serverless host this file is loaded without server.js, so nothing has
// connected yet. Locally the connection already exists and this passes through.
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Session setup
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongoUri,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);
app.use(exposeCsrfToken);

// Routes
app.use("/", authRoutes);
app.use("/", memorialRoutes);
app.use("/", publicRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
