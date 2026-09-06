require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/authMiddleware");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// Routes
app.use("/", authRoutes);

app.get("/", (req, res) => {
  res.redirect(req.session.userId ? "/dashboard" : "/login");
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { userName: req.session.userName });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error (non-fatal):", err.message);
});
