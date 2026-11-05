const Memorial = require("../models/Memorial");
const config = require("../config");
const { renderError } = require("../middleware/errorHandlers");

function renderMemorialNotFound(res) {
  renderError(
    res,
    404,
    "This memorial isn't available",
    "It may not be published yet, or the link may have changed. If you scanned a QR code, please check with the family who shared it.",
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

exports.lightCandle = async (req, res) => {
  try {
    const memorial = await Memorial.findOneAndUpdate(
      { slug: req.params.slug, isPublic: true },
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
      { slug: req.params.slug, isPublic: true },
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
