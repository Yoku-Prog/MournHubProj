const Memorial = require("../models/Memorial");
const crypto = require("crypto");
const QRCode = require("qrcode");

// Helper: generate a unique, URL-safe slug from the person's name
function generateSlug(fullName) {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-"); // spaces to dashes

  const randomSuffix = crypto.randomBytes(3).toString("hex"); // e.g. "a1b2c3"
  return `${base}-${randomSuffix}`;
}

// Show all memorials created by the logged-in admin
exports.listMemorials = async (req, res) => {
  try {
    const memorials = await Memorial.find({
      createdBy: req.session.userId,
    }).sort({ createdAt: -1 });

    // Generate QR code data URLs for public memorials
    const memorialsWithQR = await Promise.all(
      memorials.map(async (memorial) => {
        const memorialObj = memorial.toObject();
        if (memorial.isPublic) {
          const publicUrl = `${req.protocol}://${req.get("host")}/memorial/${memorial.slug}`;
          memorialObj.qrCode = await QRCode.toDataURL(publicUrl);
          memorialObj.publicUrl = publicUrl;
        }
        return memorialObj;
      }),
    );

    res.render("dashboard", {
      userName: req.session.userName,
      memorials: memorialsWithQR,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong loading your memorials.");
  }
};

// Show the "create new memorial" form
exports.getCreateForm = (req, res) => {
  res.render("memorial-form", { memorial: null, error: null });
};

// Handle creating a new memorial
exports.createMemorial = async (req, res) => {
  try {
    const { fullName, birthDate, deathDate, lifeStory } = req.body;

    if (!fullName || !lifeStory) {
      return res.render("memorial-form", {
        memorial: req.body,
        error: "Full name and life story are required.",
      });
    }

    const slug = generateSlug(fullName);

    const newMemorial = new Memorial({
      fullName,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      lifeStory,
      slug,
      createdBy: req.session.userId,
    });

    await newMemorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("memorial-form", {
      memorial: req.body,
      error: "Something went wrong. Please try again.",
    });
  }
};

// Show the edit form for a specific memorial
exports.getEditForm = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }
    res.render("memorial-form", { memorial, error: null });
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

// Handle updating an existing memorial
exports.updateMemorial = async (req, res) => {
  try {
    const { fullName, birthDate, deathDate, lifeStory } = req.body;

    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    memorial.fullName = fullName;
    memorial.birthDate = birthDate || null;
    memorial.deathDate = deathDate || null;
    memorial.lifeStory = lifeStory;

    await memorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

// Toggle publish/unpublish
exports.togglePublish = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    memorial.isPublic = !memorial.isPublic;
    await memorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

// Delete a memorial
exports.deleteMemorial = async (req, res) => {
  try {
    await Memorial.deleteOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};
