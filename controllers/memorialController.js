const Memorial = require("../models/Memorial");
const config = require("../config");
const crypto = require("crypto");
const QRCode = require("qrcode");
const multer = require("multer");
const slugify = require("slugify");
const cloudinary = require("cloudinary").v2;
const { formatDateInput } = require("../utils/dates");
const { TERMS, isTerm, endOfTerm, hasEnded, daysLeft } = require("../utils/terms");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_GALLERY_UPLOADS = 10;
const MAX_NAME_LENGTH = 120;
const MAX_STORY_LENGTH = 20000;
const MAX_CAPTION_LENGTH = 200;

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
  { name: "galleryPhotos", maxCount: MAX_GALLERY_UPLOADS },
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

// Delivery URLs end in /upload/v<version>/<public id>.<extension>
function cloudinaryPublicId(url) {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url || "");
  return match ? match[1] : null;
}

// Best effort: a Cloudinary outage shouldn't undo a change already saved
async function deleteFromCloudinary(urls) {
  const publicIds = urls.map(cloudinaryPublicId).filter(Boolean);
  const results = await Promise.allSettled(
    publicIds.map((id) => cloudinary.uploader.destroy(id, { invalidate: true })),
  );
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Could not delete ${publicIds[i]}:`, result.reason);
    }
  });
}

async function uploadMemorialPhotos(req) {
  const mainFiles = (req.files && req.files.photo) || [];
  const galleryFiles = (req.files && req.files.galleryPhotos) || [];

  const results = await Promise.allSettled(
    [...mainFiles, ...galleryFiles].map((file) =>
      uploadToCloudinary(file.buffer),
    ),
  );
  const urls = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const failed = results.find((result) => result.status === "rejected");
  if (failed) {
    await deleteFromCloudinary(urls);
    throw failed.reason;
  }

  return {
    urls,
    photoUrl: mainFiles.length > 0 ? urls[0] : null,
    galleryPhotos: urls
      .slice(mainFiles.length)
      .map((url) => ({ url, caption: "" })),
  };
}

function generateSlug(fullName) {
  const base = slugify(fullName, { lower: true, strict: true }) || "memorial";
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${randomSuffix}`;
}

function validateMemorial({ fullName, birthDate, deathDate, lifeStory }) {
  const isBlank = (value) => typeof value !== "string" || !value.trim();
  if (isBlank(fullName) || isBlank(lifeStory)) {
    return "Full name and life story are required.";
  }
  if (fullName.trim().length > MAX_NAME_LENGTH) {
    return `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (lifeStory.trim().length > MAX_STORY_LENGTH) {
    return `Life story must be ${MAX_STORY_LENGTH.toLocaleString("en-US")} characters or fewer.`;
  }
  const isDate = (value) => value === undefined || typeof value === "string";
  if (!isDate(birthDate) || !isDate(deathDate)) {
    return "Please enter valid dates.";
  }

  const birth = birthDate ? new Date(birthDate) : null;
  const death = deathDate ? new Date(deathDate) : null;
  if ((birth && isNaN(birth)) || (death && isNaN(death))) {
    return "Please enter valid dates.";
  }
  if (birth && death && birth > death) {
    return "Birth date must be before the death date.";
  }
  return null;
}

// Puts what the user typed back in the form, on top of the saved memorial
function withSubmittedValues(memorial, body) {
  const values = memorial ? memorial.toObject() : {};
  ["fullName", "birthDate", "deathDate", "lifeStory"].forEach((field) => {
    if (body && typeof body[field] === "string") {
      values[field] = body[field];
    }
  });
  return values;
}

function renderForm(res, memorial, error = null, status = 200) {
  res
    .status(status)
    .render("memorial-form", { memorial, error, formatDateInput });
}

function findOwnedMemorial(req) {
  return Memorial.findOne({
    _id: req.params.id,
    createdBy: req.session.userId,
  });
}

function uploadErrorMessage(err) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return "One of your photos is too large. Please use images under 10MB each.";
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return `You can add up to ${MAX_GALLERY_UPLOADS} gallery photos at a time.`;
  }
  return "There was a problem uploading your photos: " + err.message;
}

exports.handleUploadErrors = async (err, req, res, next) => {
  let memorial = null;
  if (req.params.id) {
    memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }
  }
  renderForm(
    res,
    withSubmittedValues(memorial, req.body),
    uploadErrorMessage(err),
    400,
  );
};

exports.listMemorials = async (req, res) => {
  try {
    const memorials = await Memorial.find({
      createdBy: req.session.userId,
    })
      .select(
        "fullName slug isPublic photoUrl candleCount guestbookEntries term expiresAt",
      )
      .sort({ createdAt: -1 });

    const baseUrl = config.publicBaseUrl(req);

    res.render("dashboard", {
      userName: req.session.userName,
      userRole: req.session.userRole,
      terms: TERMS,
      memorials: memorials.map((memorial) => ({
        ...memorial.toObject(),
        publicUrl: `${baseUrl}/memorial/${memorial.slug}`,
        isEnded: hasEnded(memorial),
        daysLeft: daysLeft(memorial),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", {
      title: "Something went wrong",
      message: "We couldn't load your memorials. Please try again.",
    });
  }
};

// High resolution and error correction: these get printed and placed outdoors,
// where they need to survive weathering and still scan.
exports.getQrCode = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.sendStatus(404);
    }

    const publicUrl = `${config.publicBaseUrl(req)}/memorial/${memorial.slug}`;
    const png = await QRCode.toBuffer(publicUrl, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "H",
    });

    res.type("png").send(png);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

exports.getCreateForm = (req, res) => {
  renderForm(res, null);
};

exports.createMemorial = async (req, res) => {
  let uploadedUrls = [];
  try {
    const { fullName, birthDate, deathDate, lifeStory } = req.body;

    const invalid = validateMemorial(req.body);
    if (invalid) {
      return renderForm(res, withSubmittedValues(null, req.body), invalid, 400);
    }

    const { urls, photoUrl, galleryPhotos } = await uploadMemorialPhotos(req);
    uploadedUrls = urls;

    const newMemorial = new Memorial({
      fullName,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      lifeStory,
      slug: generateSlug(fullName),
      photoUrl,
      photos: galleryPhotos,
      createdBy: req.session.userId,
    });

    await newMemorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    await deleteFromCloudinary(uploadedUrls);
    renderForm(
      res,
      withSubmittedValues(null, req.body),
      "Something went wrong. Please try again.",
      500,
    );
  }
};

exports.getEditForm = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }
    renderForm(res, memorial);
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.updateMemorial = async (req, res) => {
  let memorial;
  let uploadedUrls = [];
  try {
    memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    const invalid = validateMemorial(req.body);
    if (invalid) {
      return renderForm(
        res,
        withSubmittedValues(memorial, req.body),
        invalid,
        400,
      );
    }

    const { urls, photoUrl, galleryPhotos } = await uploadMemorialPhotos(req);
    uploadedUrls = urls;

    const { fullName, birthDate, deathDate, lifeStory } = req.body;
    memorial.fullName = fullName;
    memorial.birthDate = birthDate || null;
    memorial.deathDate = deathDate || null;
    memorial.lifeStory = lifeStory;

    // Captions are sent as captions[<photo id>] alongside the rest of the form
    const captions = req.body.captions;
    if (captions && typeof captions === "object") {
      memorial.photos.forEach((photo) => {
        const caption = captions[photo._id];
        if (typeof caption === "string") {
          photo.caption = caption.trim().slice(0, MAX_CAPTION_LENGTH);
        }
      });
    }
    memorial.photos.push(...galleryPhotos);

    const replacedPhotoUrl = photoUrl ? memorial.photoUrl : null;
    if (photoUrl) {
      memorial.photoUrl = photoUrl;
    }

    await memorial.save();

    if (replacedPhotoUrl) {
      await deleteFromCloudinary([replacedPhotoUrl]);
    }
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    await deleteFromCloudinary(uploadedUrls);
    if (!memorial) {
      return res.redirect("/dashboard");
    }
    renderForm(
      res,
      withSubmittedValues(await findOwnedMemorial(req), req.body),
      "Something went wrong and your changes weren't saved. Please try again.",
      500,
    );
  }
};

exports.togglePublish = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    // A memorial whose time has ended comes back through extendTerm instead
    if (hasEnded(memorial)) {
      return res.redirect("/dashboard");
    }

    if (memorial.isPublic) {
      // Taking it down for a while doesn't stop or reset its time online
      memorial.isPublic = false;
    } else if (memorial.term) {
      memorial.isPublic = true;
    } else {
      // First publication: the time online is chosen now and starts now
      const { term } = req.body;
      if (!isTerm(term)) {
        return res.redirect("/dashboard");
      }
      memorial.term = term;
      memorial.expiresAt = endOfTerm(term, new Date());
      memorial.termPurchases.push({ term });
      memorial.isPublic = true;
    }

    await memorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

// Adds time to a memorial that has an end date, or brings back one that ended.
// New time is added after what's left, so extending early loses nothing.
exports.extendTerm = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    const { term } = req.body;
    if (!memorial || !memorial.expiresAt || !isTerm(term)) {
      return res.redirect("/dashboard");
    }

    const now = new Date();
    const ended = hasEnded(memorial, now);
    memorial.expiresAt = endOfTerm(term, ended ? now : memorial.expiresAt);
    memorial.term = term;
    memorial.termPurchases.push({ term });
    if (ended) {
      memorial.isPublic = true;
    }

    await memorial.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.deleteMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.session.userId,
    });
    if (memorial) {
      await deleteFromCloudinary([
        memorial.photoUrl,
        ...memorial.photos.map((photo) => photo.url),
      ]);
    }
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.deleteGalleryPhoto = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    const photo = memorial.photos.id(req.params.photoId);
    if (photo) {
      const { url } = photo;
      photo.deleteOne();
      await memorial.save();
      await deleteFromCloudinary([url]);
    }

    res.redirect("/memorials/" + req.params.id + "/edit");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

exports.deleteGuestbookEntry = async (req, res) => {
  try {
    const memorial = await findOwnedMemorial(req);
    if (!memorial) {
      return res.redirect("/dashboard");
    }

    // Already gone if the form was submitted twice or from a stale page
    const entry = memorial.guestbookEntries.id(req.params.entryId);
    if (entry) {
      entry.deleteOne();
      await memorial.save();
    }

    res.redirect("/memorials/" + req.params.id + "/edit");
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};
