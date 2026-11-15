const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app, request, mongoose, mongod, User, Memorial, bcrypt;
const destroyed = [];
let uploadCount = 0;
let nextIp = 1;

const PASSWORD = "correct-horse";
const OWNER_EMAIL = "owner@example.com";

before(async () => {
  mongod = await MongoMemoryServer.create();

  // All set before the app loads. dotenv never overrides these, so the tests
  // can't reach the real database or Cloudinary account in .env.
  Object.assign(process.env, {
    NODE_ENV: "test",
    MONGO_URI: mongod.getUri(),
    SESSION_SECRET: "test-secret",
    BASE_URL: "https://memorials.test/",
    SUPERADMIN_EMAIL: OWNER_EMAIL,
    CONTACT_EMAIL: "",
    DNS_SERVERS: "",
    TRUST_PROXY: "1",
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "test",
    CLOUDINARY_API_SECRET: "test",
  });

  const cloudinary = require("cloudinary").v2;
  cloudinary.uploader.upload_stream = (options, callback) => ({
    end() {
      uploadCount += 1;
      callback(null, {
        secure_url: `https://res.cloudinary.com/test/image/upload/v1/mournhub/img${uploadCount}.jpg`,
      });
    },
  });
  cloudinary.uploader.destroy = async (id, options) => {
    destroyed.push({ id, options });
  };

  request = require("supertest");
  bcrypt = require("bcrypt");
  mongoose = require("mongoose");
  User = require("../models/User");
  Memorial = require("../models/Memorial");
  app = require("../app");
  await require("../config/db")();
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Memorial.deleteMany({});
  destroyed.length = 0;
});

const uniqueIp = () => `10.0.${Math.floor(nextIp / 250)}.${(nextIp++ % 250) + 1}`;

const tokenFrom = (html) => /name="_csrf" value="([^"]+)"/.exec(html)[1];

async function createUser(overrides = {}) {
  return User.create({
    name: "Test Admin",
    email: `admin${Math.random()}@example.com`,
    password: await bcrypt.hash(PASSWORD, 4),
    isApproved: true,
    ...overrides,
  });
}

async function login(user, password = PASSWORD) {
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const res = await agent
    .post("/login")
    .type("form")
    .send({ _csrf: tokenFrom(page.text), email: user.email, password });
  return { agent, res };
}

async function loggedIn(overrides) {
  const user = await createUser(overrides);
  const { agent, res } = await login(user);
  assert.equal(res.status, 302);
  const dashboard = await agent.get("/dashboard");
  return { agent, user, token: tokenFrom(dashboard.text) };
}

const createMemorial = (user, overrides = {}) =>
  Memorial.create({
    fullName: "Maria Santos",
    lifeStory: "She loved her garden.",
    slug: `maria-${Math.random().toString(36).slice(2)}`,
    createdBy: user._id,
    ...overrides,
  });

// Accounts and superadmin

test("a first registration with any other email stays pending", async () => {
  const agent = request.agent(app);
  const page = await agent.get("/register");
  const res = await agent.post("/register").type("form").send({
    _csrf: tokenFrom(page.text),
    name: "Stranger",
    email: "stranger@example.com",
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  assert.equal(res.status, 200);
  const user = await User.findOne({ email: "stranger@example.com" });
  assert.equal(user.role, "admin");
  assert.equal(user.isApproved, false);
});

test("registering with SUPERADMIN_EMAIL creates the superadmin", async () => {
  const agent = request.agent(app);
  const page = await agent.get("/register");
  const res = await agent.post("/register").type("form").send({
    _csrf: tokenFrom(page.text),
    name: "Owner",
    email: OWNER_EMAIL.toUpperCase(),
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  assert.equal(res.headers.location, "/dashboard");
  const owner = await User.findOne({ email: OWNER_EMAIL });
  assert.equal(owner.role, "superadmin");
  assert.equal(owner.isApproved, true);
});

test("registration rejects invalid emails and overlong input", async () => {
  const register = async (fields) => {
    const agent = request.agent(app);
    const page = await agent.get("/register");
    return agent.post("/register").type("form").send({
      _csrf: tokenFrom(page.text),
      name: "Someone",
      email: "someone@example.com",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      ...fields,
    });
  };

  assert.equal((await register({ email: "not-an-email" })).status, 400);
  assert.equal((await register({ name: "x".repeat(81) })).status, 400);
  const longPassword = "p".repeat(73);
  assert.equal(
    (await register({ password: longPassword, confirmPassword: longPassword })).status,
    400,
  );
  assert.equal(await User.countDocuments(), 0);
});

test("the create-superadmin script makes one superadmin with a reset link", async () => {
  const { createSuperAdmin } = require("../scripts/create-superadmin");
  const token = await createSuperAdmin(" Boss@Example.com ", "Boss");
  const boss = await User.findOne({ email: "boss@example.com" });
  assert.equal(boss.role, "superadmin");
  assert.equal(boss.isApproved, true);
  assert.equal((await request(app).get(`/reset-password/${token}`)).status, 200);

  await assert.rejects(createSuperAdmin("second@example.com", "Second"), /already exists/);
});

test("a missing account is rejected the same way as a wrong password", async () => {
  const user = await createUser();
  const missing = await login({ email: "nobody@example.com" });
  const wrong = await login(user, "wrong-password");
  assert.equal(missing.res.status, 401);
  assert.equal(wrong.res.status, 401);
  const withoutToken = (html) => html.replace(/name="_csrf" value="[^"]+"/, "");
  assert.equal(withoutToken(missing.res.text), withoutToken(wrong.res.text));
});

test("pending accounts can't log in", async () => {
  const user = await createUser({ isApproved: false });
  const { res } = await login(user);
  assert.equal(res.status, 403);
});

test("wrong passwords are rejected and eventually rate limited", async () => {
  const user = await createUser();
  const ip = uniqueIp();
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const attempt = () =>
    agent
      .post("/login")
      .set("X-Forwarded-For", ip)
      .type("form")
      .send({ _csrf: tokenFrom(page.text), email: user.email, password: "nope" });

  for (let i = 0; i < 10; i++) {
    assert.equal((await attempt()).status, 401);
  }
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.match(blocked.text, /Too many failed attempts/);
});

test("logging in issues a new session ID", async () => {
  const user = await createUser();
  const agent = request.agent(app);
  const page = await agent.get("/login");
  const before = page.headers["set-cookie"][0].split(";")[0];
  const res = await agent
    .post("/login")
    .type("form")
    .send({ _csrf: tokenFrom(page.text), email: user.email, password: PASSWORD });
  assert.notEqual(res.headers["set-cookie"][0].split(";")[0], before);
});

test("logout only works by POST with a token", async () => {
  const { agent, token } = await loggedIn();
  assert.equal((await agent.get("/logout")).status, 404);
  assert.equal((await agent.post("/logout").type("form").send({})).status, 403);
  const res = await agent.post("/logout").type("form").send({ _csrf: token });
  assert.equal(res.headers.location, "/login");
  assert.equal((await agent.get("/dashboard")).headers.location, "/login");
});

// CSRF

test("state changes need a CSRF token, including multipart requests", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user);

  const toggled = await agent
    .post(`/memorials/${memorial._id}/toggle-publish`)
    .type("form")
    .send({});
  assert.equal(toggled.status, 403);

  const multipartDelete = await agent
    .post(`/memorials/${memorial._id}/delete`)
    .field("anything", "x");
  assert.equal(multipartDelete.status, 403);

  const created = await agent
    .post("/memorials/new")
    .field("fullName", "No Token")
    .field("lifeStory", "Story");
  assert.equal(created.status, 403);

  assert.equal(await Memorial.countDocuments(), 1);
  assert.equal((await Memorial.findById(memorial._id)).isPublic, false);
  assert.ok(token);
});

// Admin management

test("non-superadmins can't manage admins", async () => {
  const { agent } = await loggedIn();
  assert.equal((await agent.get("/admins")).status, 403);
});

test("revoking an admin ends their session immediately and keeps memorials", async () => {
  const { agent: superAgent, token } = await loggedIn({ role: "superadmin" });
  const { agent, user } = await loggedIn();
  const memorial = await createMemorial(user, { isPublic: true });

  await superAgent
    .post(`/admins/${user._id}/revoke`)
    .type("form")
    .send({ _csrf: token });

  assert.equal((await agent.get("/dashboard")).headers.location, "/login");
  assert.equal((await login(user)).res.status, 403);
  assert.equal((await request(app).get(`/memorial/${memorial.slug}`)).status, 200);
});

test("the superadmin can't be revoked or rejected", async () => {
  const { agent, user, token } = await loggedIn({ role: "superadmin" });
  await agent.post(`/admins/${user._id}/revoke`).type("form").send({ _csrf: token });
  await agent.post(`/admins/${user._id}/reject`).type("form").send({ _csrf: token });
  const fresh = await User.findById(user._id);
  assert.equal(fresh.isApproved, true);
});

test("reject only deletes pending accounts without memorials", async () => {
  const { agent, token } = await loggedIn({ role: "superadmin" });
  const approved = await createUser();
  const pending = await createUser({ isApproved: false });
  const revokedWithMemorial = await createUser({ isApproved: false });
  await createMemorial(revokedWithMemorial);

  const post = (id) =>
    agent.post(`/admins/${id}/reject`).type("form").send({ _csrf: token });

  await post(approved._id);
  await post(pending._id);
  const blocked = await post(revokedWithMemorial._id);

  assert.ok(await User.findById(approved._id));
  assert.equal(await User.findById(pending._id), null);
  assert.ok(await User.findById(revokedWithMemorial._id));
  assert.equal(blocked.status, 409);
});

test("reset links work once, change the password, and end old sessions", async () => {
  const { agent: superAgent, token } = await loggedIn({ role: "superadmin" });
  const { agent: oldSession, user } = await loggedIn();

  const page = await superAgent
    .post(`/admins/${user._id}/reset-link`)
    .type("form")
    .send({ _csrf: token });
  const link = /https:\/\/memorials\.test(\/reset-password\/[a-f0-9]+)/.exec(page.text)[1];

  const stored = await User.findById(user._id);
  assert.ok(!stored.passwordResetTokenHash.includes(link.split("/").pop()));

  const visitor = request.agent(app);
  const form = await visitor.get(link);
  assert.equal(form.status, 200);
  const csrf = tokenFrom(form.text);

  const short = await visitor
    .post(link)
    .type("form")
    .send({ _csrf: csrf, password: "short", confirmPassword: "short" });
  assert.equal(short.status, 400);

  const newPassword = "a-brand-new-password";
  const done = await visitor
    .post(link)
    .type("form")
    .send({ _csrf: csrf, password: newPassword, confirmPassword: newPassword });
  assert.match(done.text, /password has been updated/);

  assert.equal((await visitor.get(link)).status, 400);
  assert.equal((await oldSession.get("/dashboard")).headers.location, "/login");
  assert.equal((await login(user)).res.status, 401);
  assert.equal((await login(user, newPassword)).res.status, 302);
});

test("expired reset links are refused", async () => {
  const user = await createUser();
  const token = await user.createPasswordResetToken();
  user.passwordResetExpires = new Date(Date.now() - 1000);
  await user.save();
  assert.equal((await request(app).get(`/reset-password/${token}`)).status, 400);
});

// Memorial form

test("a failed create keeps what was typed and stays on the create form", async () => {
  const { agent, token } = await loggedIn();
  const res = await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "Maria Santos")
    .field("birthDate", "1950-03-14")
    .field("deathDate", "2020-01-01")
    .field("lifeStory", "   ");

  assert.equal(res.status, 400);
  assert.match(res.text, /action="\/memorials\/new"/);
  assert.match(res.text, /Create New Memorial/);
  assert.match(res.text, /value="Maria Santos"/);
  assert.match(res.text, /value="1950-03-14"/);
  assert.equal(await Memorial.countDocuments(), 0);
});

test("an overlong life story is rejected", async () => {
  const { agent, token } = await loggedIn();
  const res = await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "Maria Santos")
    .field("lifeStory", "x".repeat(20001));
  assert.equal(res.status, 400);
  assert.match(res.text, /20,000 characters or fewer/);
  assert.equal(await Memorial.countDocuments(), 0);
});

test("a rejected file type shows a helpful error, not a crash", async () => {
  const { agent, token } = await loggedIn();
  const res = await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "Maria Santos")
    .field("birthDate", "1950-03-14")
    .attach("photo", Buffer.from("text"), {
      filename: "notes.txt",
      contentType: "text/plain",
    });

  assert.equal(res.status, 400);
  assert.match(res.text, /Only JPG, PNG, or WEBP/);
  assert.match(res.text, /action="\/memorials\/new"/);
  assert.match(res.text, /value="1950-03-14"/);
});

test("too many gallery photos gets a clear message", async () => {
  const { agent, token } = await loggedIn();
  let req = agent.post("/memorials/new").field("_csrf", token);
  for (let i = 0; i < 11; i++) {
    req = req.attach("galleryPhotos", Buffer.from("x"), {
      filename: `${i}.jpg`,
      contentType: "image/jpeg",
    });
  }
  const res = await req;
  assert.equal(res.status, 400);
  assert.match(res.text, /up to 10 gallery photos/);
});

test("a failed edit keeps the edits, the form target, and the gallery", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    photos: [{ url: "https://res.cloudinary.com/test/image/upload/v1/mournhub/g.jpg" }],
  });

  const res = await agent
    .post(`/memorials/${memorial._id}/edit`)
    .field("_csrf", token)
    .field("fullName", "")
    .field("birthDate", "1950-03-14")
    .field("lifeStory", "My unsaved draft");

  assert.equal(res.status, 400);
  assert.match(res.text, new RegExp(`action="/memorials/${memorial._id}/edit"`));
  assert.match(res.text, /My unsaved draft/);
  assert.match(res.text, /mournhub\/g\.jpg/);
  assert.equal((await Memorial.findById(memorial._id)).lifeStory, "She loved her garden.");
});

test("dates must be in order", async () => {
  const { agent, token } = await loggedIn();
  const res = await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "Maria")
    .field("lifeStory", "Story")
    .field("birthDate", "2020-01-01")
    .field("deathDate", "1950-01-01");
  assert.equal(res.status, 400);
  assert.match(res.text, /Birth date must be before/);
});

test("creating a memorial uploads photos and keeps accents in the link", async () => {
  const { agent, token } = await loggedIn();
  const res = await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "José Peña")
    .field("lifeStory", "Story")
    .attach("photo", Buffer.from("x"), { filename: "a.jpg", contentType: "image/jpeg" })
    .attach("galleryPhotos", Buffer.from("x"), { filename: "b.jpg", contentType: "image/jpeg" });

  assert.equal(res.headers.location, "/dashboard");
  const memorial = await Memorial.findOne();
  assert.match(memorial.slug, /^jose-pena-[a-f0-9]{6}$/);
  assert.match(memorial.photoUrl, /res\.cloudinary\.com/);
  assert.equal(memorial.photos.length, 1);
  assert.notEqual(memorial.photoUrl, memorial.photos[0].url);
});

test("names with no Latin letters still get a usable link", async () => {
  const { agent, token } = await loggedIn();
  await agent
    .post("/memorials/new")
    .field("_csrf", token)
    .field("fullName", "李明")
    .field("lifeStory", "Story");
  assert.match((await Memorial.findOne()).slug, /^[a-z0-9-]+-[a-f0-9]{6}$/);
});

test("other admins can't touch a memorial", async () => {
  const { user: owner } = await loggedIn();
  const memorial = await createMemorial(owner);
  const { agent, token } = await loggedIn();

  await agent.post(`/memorials/${memorial._id}/delete`).type("form").send({ _csrf: token });
  await agent.post(`/memorials/${memorial._id}/toggle-publish`).type("form").send({ _csrf: token });

  const fresh = await Memorial.findById(memorial._id);
  assert.ok(fresh);
  assert.equal(fresh.isPublic, false);
  assert.equal((await agent.get(`/memorials/${memorial._id}/qr.png`)).status, 404);
});

// Cloudinary cleanup

const cloudinaryUrl = (name) =>
  `https://res.cloudinary.com/test/image/upload/v123/mournhub/${name}.jpg`;

test("deleting a gallery photo removes it from Cloudinary", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    photos: [{ url: cloudinaryUrl("keep") }, { url: cloudinaryUrl("remove") }],
  });

  await agent
    .post(`/memorials/${memorial._id}/photos/${memorial.photos[1]._id}/delete`)
    .type("form")
    .send({ _csrf: token });

  assert.deepEqual(destroyed, [{ id: "mournhub/remove", options: { invalidate: true } }]);
  assert.equal((await Memorial.findById(memorial._id)).photos.length, 1);
});

test("deleting a memorial removes all of its photos from Cloudinary", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    photoUrl: cloudinaryUrl("main"),
    photos: [{ url: cloudinaryUrl("one") }],
  });

  await agent.post(`/memorials/${memorial._id}/delete`).type("form").send({ _csrf: token });

  assert.deepEqual(destroyed.map((d) => d.id).sort(), ["mournhub/main", "mournhub/one"]);
});

test("replacing the main photo removes the old one from Cloudinary", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, { photoUrl: cloudinaryUrl("old") });

  await agent
    .post(`/memorials/${memorial._id}/edit`)
    .field("_csrf", token)
    .field("fullName", "Maria Santos")
    .field("lifeStory", "Story")
    .attach("photo", Buffer.from("x"), { filename: "a.jpg", contentType: "image/jpeg" });

  assert.deepEqual(destroyed.map((d) => d.id), ["mournhub/old"]);
  assert.notEqual((await Memorial.findById(memorial._id)).photoUrl, cloudinaryUrl("old"));
});

// Dashboard and QR codes

test("dashboard and QR codes use BASE_URL, whatever the request host", async () => {
  const { agent, user } = await loggedIn();
  const memorial = await createMemorial(user, { isPublic: true });

  const dashboard = await agent.get("/dashboard").set("Host", "attacker.example");
  assert.ok(dashboard.text.includes(`https://memorials.test/memorial/${memorial.slug}`));
  assert.ok(!dashboard.text.includes("attacker.example"));

  const QRCode = require("qrcode");
  const original = QRCode.toBuffer;
  let encoded, options;
  QRCode.toBuffer = async (text, opts) => {
    encoded = text;
    options = opts;
    return original(text, opts);
  };
  const qr = await agent.get(`/memorials/${memorial._id}/qr.png`);
  QRCode.toBuffer = original;

  assert.equal(qr.status, 200);
  assert.equal(qr.headers["content-type"], "image/png");
  assert.equal(encoded, `https://memorials.test/memorial/${memorial.slug}`);
  assert.equal(options.errorCorrectionLevel, "H");
  assert.equal(options.width, 1024);
});

// Public pages

test("public memorial without a photo has no empty image", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, { isPublic: true });
  const res = await request(app).get(`/memorial/${memorial.slug}`);
  assert.equal(res.status, 200);
  assert.ok(!res.text.includes('class="memorial-photo"'));
  assert.match(res.text, /name="robots" content="noindex"/);
  assert.match(res.text, /lang="en"/);
});

test("the life story comes before the guestbook", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, { isPublic: true });
  const { text } = await request(app).get(`/memorial/${memorial.slug}`);
  assert.ok(text.indexOf("memorial-story") < text.indexOf("guestbook-section"));
});

test("dates display on the day that was entered", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, {
    isPublic: true,
    birthDate: "1950-03-14",
  });
  const { text } = await request(app).get(`/memorial/${memorial.slug}`);
  assert.match(text, /March 14, 1950/);
});

test("unpublished memorials and unknown pages get a proper 404 page", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user);

  for (const path of [`/memorial/${memorial.slug}`, `/memorial/${memorial.slug}/gallery`, "/nope"]) {
    const res = await request(app).get(path);
    assert.equal(res.status, 404);
    assert.match(res.headers["content-type"], /html/);
    assert.match(res.text, /Return to MournHub/);
  }
});

test("guestbook input is escaped, validated, and rate limited", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, { isPublic: true });
  const url = `/memorial/${memorial.slug}/guestbook`;
  const ip = uniqueIp();
  const post = (body) => request(app).post(url).set("X-Forwarded-For", ip).send(body);

  assert.equal((await post({ name: { $gt: "" }, message: "hi" })).status, 400);
  assert.equal((await post({ name: "   ", message: "hi" })).status, 400);
  assert.equal((await post({ name: "A", message: "x".repeat(501) })).status, 400);

  const ok = await post({ name: "<script>alert(1)</script>", message: "Rest well" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.total, 1);

  const page = await request(app).get(`/memorial/${memorial.slug}`);
  assert.ok(!page.text.includes("<script>alert(1)"));
  assert.ok(page.text.includes("&lt;script&gt;alert(1)"));

  await post({ name: "B", message: "Fifth request in the window" });
  const blocked = await post({ name: "C", message: "Too many" });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error, /try again/);
});

test("candles count up and only work on published memorials", async () => {
  const user = await createUser();
  const published = await createMemorial(user, { isPublic: true });
  const draft = await createMemorial(user);

  const res = await request(app)
    .post(`/memorial/${published.slug}/light-candle`)
    .set("X-Forwarded-For", uniqueIp())
    .send({});
  assert.deepEqual(res.body, { candleCount: 1 });

  const missing = await request(app)
    .post(`/memorial/${draft.slug}/light-candle`)
    .set("X-Forwarded-For", uniqueIp())
    .send({});
  assert.equal(missing.status, 404);
});

test("other sites' forms can't post guestbook entries or light candles", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, { isPublic: true });
  const formPost = (action, body) =>
    request(app)
      .post(`/memorial/${memorial.slug}/${action}`)
      .set("X-Forwarded-For", uniqueIp())
      .type("form")
      .send(body);

  assert.equal((await formPost("guestbook", { name: "Spam", message: "Buy now" })).status, 415);
  assert.equal((await formPost("light-candle", {})).status, 415);

  const saved = await Memorial.findById(memorial._id);
  assert.equal(saved.guestbookEntries.length, 0);
  assert.equal(saved.candleCount, 0);
});

test("security headers are set and scripts are same-origin only", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-security-policy"], /script-src 'self'/);
  assert.doesNotMatch(res.headers["content-security-policy"], /unsafe-inline/);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.ok(!/<script>/.test(res.text), "landing page has no inline scripts");
});

test("landing page has no placeholder contact details or stock photos", async () => {
  const { text } = await request(app).get("/");
  assert.ok(!text.includes("youremail@example.com"));
  assert.ok(!text.includes("unsplash"));
  assert.match(text, /href="\/login"/);
});

test("landing page has a real code for the sample and states it isn't a real person", async () => {
  const QRCode = require("qrcode");
  const original = QRCode.toString;
  let encoded;
  QRCode.toString = async (text, opts) => {
    encoded = text;
    return original(text, opts);
  };
  const { text } = await request(app).get("/");
  QRCode.toString = original;

  assert.equal(encoded, "https://memorials.test/#sample");
  assert.match(text, /<svg[^>]*viewBox/);
  assert.match(text, /id="sample"/);
  assert.match(text, /isn't a real person/);
});

test("the landing page's main action falls back to registering without a contact email", async () => {
  const { text } = await request(app).get("/");
  assert.ok(!text.includes("mailto:"));
  assert.match(text, /href="\/register" class="gilded"/);
});

test("logged-in users skip the landing page", async () => {
  const { agent } = await loggedIn();
  assert.equal((await agent.get("/")).headers.location, "/dashboard");
});

test("no view uses inline event handlers, which the CSP would block", () => {
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "../views");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ejs"))) {
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    assert.ok(!/\son[a-z]+="/.test(html), `${file} has an inline handler`);
    assert.ok(!/\sstyle="/.test(html), `${file} has an inline style`);
  }
});

test("a gallery photo opens on its own page with a way back", async () => {
  const user = await User.create({
    name: "Photo Owner",
    email: "photo-owner@example.com",
    password: "x",
    isApproved: true,
  });
  const memorial = await Memorial.create({
    fullName: "Photo Page",
    lifeStory: "Story",
    slug: "photo-page-test",
    isPublic: true,
    createdBy: user._id,
    photos: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/mournhub/a.jpg" }],
  });
  const photoPath = `/memorial/${memorial.slug}/photos/${memorial.photos[0]._id}`;

  const page = await request(app).get(`/memorial/${memorial.slug}`);
  assert.ok(page.text.includes(`href="${photoPath}"`));

  const fromMemorial = await request(app).get(photoPath);
  assert.equal(fromMemorial.status, 200);
  assert.ok(fromMemorial.text.includes(`href="/memorial/${memorial.slug}"`));

  const fromGallery = await request(app).get(`${photoPath}?from=gallery`);
  assert.ok(fromGallery.text.includes(`href="/memorial/${memorial.slug}/gallery"`));

  const missing = await request(app).get(`/memorial/${memorial.slug}/photos/nope`);
  assert.equal(missing.status, 404);
});

test("saving a memorial saves its photo captions, which show on the photo page", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    isPublic: true,
    photos: [{ url: "https://res.cloudinary.com/test/image/upload/v1/mournhub/g.jpg" }],
  });
  const photoId = memorial.photos[0]._id;

  const res = await agent
    .post(`/memorials/${memorial._id}/edit`)
    .field("_csrf", token)
    .field("fullName", "Maria Santos")
    .field("lifeStory", "She loved her garden.")
    .field(`captions[${photoId}]`, "  At the beach, 1984  ");
  assert.equal(res.headers.location, "/dashboard");

  const saved = await Memorial.findById(memorial._id);
  assert.equal(saved.photos[0].caption, "At the beach, 1984");

  const page = await request(app).get(`/memorial/${saved.slug}/photos/${photoId}`);
  assert.match(page.text, /<figcaption>At the beach, 1984<\/figcaption>/);
});

// Time online

const postForm = (agent, path, token, fields = {}) =>
  agent.post(path).type("form").send({ _csrf: token, ...fields });

test("publishing needs a choice of how long the memorial stays online", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user);
  const path = `/memorials/${memorial._id}/toggle-publish`;

  await postForm(agent, path, token);
  assert.equal((await Memorial.findById(memorial._id)).isPublic, false);

  await postForm(agent, path, token, { term: "forever" });
  assert.equal((await Memorial.findById(memorial._id)).isPublic, false);

  await postForm(agent, path, token, { term: "1y" });
  const published = await Memorial.findById(memorial._id);
  assert.equal(published.isPublic, true);
  assert.equal(published.term, "1y");
  assert.equal(published.termPurchases.length, 1);
  const days = (published.expiresAt - Date.now()) / 86400000;
  assert.ok(days > 364 && days < 367);
});

test("a permanent memorial has no end date", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user);
  await postForm(agent, `/memorials/${memorial._id}/toggle-publish`, token, { term: "permanent" });

  const published = await Memorial.findById(memorial._id);
  assert.equal(published.isPublic, true);
  assert.equal(published.expiresAt, null);
  assert.match((await agent.get("/dashboard")).text, /Permanent/);
});

test("unpublishing and publishing again keeps the same end date", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user);
  const path = `/memorials/${memorial._id}/toggle-publish`;

  await postForm(agent, path, token, { term: "5y" });
  const { expiresAt } = await Memorial.findById(memorial._id);

  await postForm(agent, path, token);
  await postForm(agent, path, token);
  const again = await Memorial.findById(memorial._id);
  assert.equal(again.isPublic, true);
  assert.equal(again.expiresAt.getTime(), expiresAt.getTime());
  assert.equal(again.termPurchases.length, 1);
});

test("a memorial whose time has ended is closed to visitors until it's brought back", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    isPublic: true,
    term: "1y",
    expiresAt: new Date(Date.now() - 86400000),
    photos: [{ url: "https://res.cloudinary.com/test/image/upload/v1/mournhub/g.jpg" }],
  });
  const page = `/memorial/${memorial.slug}`;

  const closed = await request(app).get(page);
  assert.equal(closed.status, 410);
  assert.match(closed.text, /time online has ended/);
  assert.equal((await request(app).get(`${page}/gallery`)).status, 410);
  assert.equal((await request(app).get(`${page}/photos/${memorial.photos[0]._id}`)).status, 410);
  const candle = await request(app)
    .post(`${page}/light-candle`)
    .set("Content-Type", "application/json")
    .send("{}");
  assert.equal(candle.status, 404);

  const dashboard = await agent.get("/dashboard");
  assert.match(dashboard.text, /Bring back online/);
  assert.doesNotMatch(dashboard.text, /qr\.png/);

  await postForm(agent, `/memorials/${memorial._id}/extend`, token, { term: "1y" });
  assert.equal((await request(app).get(page)).status, 200);
  const days = ((await Memorial.findById(memorial._id)).expiresAt - Date.now()) / 86400000;
  assert.ok(days > 364 && days < 367);
});

test("extending early adds the new time after what's left", async () => {
  const { agent, user, token } = await loggedIn();
  const memorial = await createMemorial(user, {
    isPublic: true,
    term: "1y",
    expiresAt: new Date(Date.now() + 10 * 86400000),
  });

  assert.match((await agent.get("/dashboard")).text, /in 10 days/);

  await postForm(agent, `/memorials/${memorial._id}/extend`, token, { term: "1y" });
  const days = ((await Memorial.findById(memorial._id)).expiresAt - Date.now()) / 86400000;
  assert.ok(days > 374 && days < 377);

  await postForm(agent, `/memorials/${memorial._id}/extend`, token, { term: "permanent" });
  assert.equal((await Memorial.findById(memorial._id)).expiresAt, null);
});

test("memorials published before terms existed stay online", async () => {
  const user = await createUser();
  const memorial = await createMemorial(user, { isPublic: true });
  assert.equal((await request(app).get(`/memorial/${memorial.slug}`)).status, 200);
});
