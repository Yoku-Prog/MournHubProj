const Memorial = require("../models/Memorial");
const crypto = require("crypto");
const QRCode = require("qrcode");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or WEBP images are allowed."));
    }
  },
});

exports.uploadPhoto = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "galleryPhotos", maxCount: 10 },
]);

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mournhub",
        quality: "auto",
        fetch_format: "auto",
        width: 800,
        crop: "limit",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

function generateSlug(fullName) {
  const base = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${randomSuffix}`;
}

exports.listMemorials = async (req, res) => {
  try {
    const memorials = await Memorial.find({
      createdBy: req.session.userId,
    }).sort({ createdAt: -1 });

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
      userRole: req.session.userRole,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong loading your memorials.");
  }
};

exports.getCreateForm = (req, res) => {
  res.render("memorial-form", { memorial: null, error: null });
};

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

    let photoUrl = null;
    if (req.files && req.files.photo && req.files.photo[0]) {
      photoUrl = await uploadToCloudinary(req.files.photo[0].buffer);
    }

    let photos = [];
    if (req.files && req.files.galleryPhotos) {
      const urls = await Promise.all(
        req.files.galleryPhotos.map((file) => uploadToCloudinary(file.buffer)),
      );
      photos = urls.map((url) => ({ url, caption: "" }));
    }

    const newMemorial = new Memorial({
      fullName,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      lifeStory,
      slug,
      photoUrl,
      photos,
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

    if (req.files && req.files.photo && req.files.photo[0]) {
      memorial.photoUrl = await uploadToCloudinary(req.files.photo[0].buffer);
    }

    if (req.files && req.files.galleryPhotos) {
      const urls = await Promise.all(
        req.files.galleryPhotos.map((file) => uploadToCloudinary(file.buffer)),
      );
      const newPhotos = urls.map((url) => ({ url, caption: "" }));
      memorial.photos = [...(memorial.photos || []), ...newPhotos];
    }

    await memorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

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

exports.deleteGalleryPhoto = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    memorial.photos = memorial.photos.filter(
      (p) => p._id.toString() !== req.params.photoId,
    );
    await memorial.save();

    res.redirect("/memorials/" + req.params.id + "/edit");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.updatePhotoCaption = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    const photo = memorial.photos.id(req.params.photoId);
    if (photo) {
      photo.caption = (req.body.caption || "").trim();
    }
    await memorial.save();

    res.redirect("/memorials/" + req.params.id + "/edit");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.deleteGuestbookEntry = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    memorial.guestbookEntries.id(req.params.entryId).deleteOne();
    await memorial.save();

    res.redirect("/memorials/" + req.params.id + "/edit");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};
