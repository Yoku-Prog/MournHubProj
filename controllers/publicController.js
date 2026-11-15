const Memorial = require("../models/Memorial");
const QRCode = require("qrcode");
const config = require("../config");
const { renderError } = require("../middleware/errorHandlers");
const { hasEnded, stillOnline } = require("../utils/terms");

// The landing page's code is real, and opens the sample memorial further down
// the page. The page still works without it if generation ever fails.
exports.viewLanding = async (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  let sampleQr = null;
  try {
    sampleQr = await QRCode.toString(`${config.publicBaseUrl(req)}/#sample`, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#2e3b34", light: "#0000" },
    });
  } catch (err) {
    console.error(err);
  }

  res.render("landing", { sampleQr });
};

function renderMemorialNotFound(res) {
  renderError(
    res,
    404,
    "This memorial isn't available",
    "It may not be published yet, or it may have been taken down for now. If you scanned a QR code, the family or the funeral home or cemetery that placed it can help.",
    "/#families",
  );
}

// The code on the marker still scans after a memorial's time online is over,
// so the visitor is told what happened and who can bring it back.
function renderMemorialEnded(res) {
  renderError(
    res,
    410,
    "This memorial's time online has ended",
    "The family, or the funeral home or cemetery that placed this code, can bring it back online.",
    "/#families",
  );
}

exports.viewPublicMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      slug: req.params.slug,
      isPublic: true,
    });

    if (!memorial) {
      return renderMemorialNotFound(res);
    }
    if (hasEnded(memorial)) {
      return renderMemorialEnded(res);
    }

    res.render("memorial-public", {
      memorial,
      publicUrl: `${config.publicBaseUrl(req)}/memorial/${memorial.slug}`,
    });
  } catch (err) {
    console.error(err);
    renderError(
      res,
      500,
      "Something went wrong",
      "We couldn't load this memorial. Please try again in a moment.",
    );
  }
};

exports.viewGallery = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      slug: req.params.slug,
      isPublic: true,
    });

    if (!memorial) {
      return renderMemorialNotFound(res);
    }
    if (hasEnded(memorial)) {
      return renderMemorialEnded(res);
    }

    res.render("memorial-gallery", { memorial });
  } catch (err) {
    console.error(err);
    renderError(
      res,
      500,
      "Something went wrong",
      "We couldn't load this gallery. Please try again in a moment.",
    );
  }
};

// One photo in full, on its own page, with a way back to where the visitor was
exports.viewPhoto = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      slug: req.params.slug,
      isPublic: true,
    });
    const photo = memorial && memorial.photos.id(req.params.photoId);

    if (memorial && hasEnded(memorial)) {
      return renderMemorialEnded(res);
    }
    if (!photo) {
      return renderMemorialNotFound(res);
    }

    const fromGallery = req.query.from === "gallery";
    res.render("memorial-photo", {
      memorial,
      photo,
      backHref: `/memorial/${memorial.slug}${fromGallery ? "/gallery" : ""}`,
      backLabel: fromGallery ? "Back to photos" : "Back to memorial",
    });
  } catch (err) {
    console.error(err);
    renderError(
      res,
      500,
      "Something went wrong",
      "We couldn't load this photo. Please try again in a moment.",
    );
  }
};

exports.lightCandle = async (req, res) => {
  try {
    const memorial = await Memorial.findOneAndUpdate(
      { slug: req.params.slug, isPublic: true, ...stillOnline() },
      { $inc: { candleCount: 1 } },
      { returnDocument: "after" },
    );

    if (!memorial) {
      return res.status(404).json({ error: "Memorial not found." });
    }

    res.json({ candleCount: memorial.candleCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

exports.addGuestbookEntry = async (req, res) => {
  try {
    const { name, message } = req.body;

    if (typeof name !== "string" || typeof message !== "string") {
      return res.status(400).json({ error: "Name and message are required." });
    }

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      return res.status(400).json({ error: "Name and message are required." });
    }

    if (trimmedName.length > 60 || trimmedMessage.length > 500) {
      return res.status(400).json({ error: "Name or message is too long." });
    }

    const memorial = await Memorial.findOneAndUpdate(
      { slug: req.params.slug, isPublic: true, ...stillOnline() },
      {
        $push: {
          guestbookEntries: { name: trimmedName, message: trimmedMessage },
        },
      },
      { returnDocument: "after" },
    );

    if (!memorial) {
      return res.status(404).json({ error: "Memorial not found." });
    }

    const newEntry =
      memorial.guestbookEntries[memorial.guestbookEntries.length - 1];
    res.json({ entry: newEntry, total: memorial.guestbookEntries.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
};
