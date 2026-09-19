const Memorial = require("../models/Memorial");

exports.viewPublicMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      slug: req.params.slug,
      isPublic: true,
    });

    if (!memorial) {
      return res.status(404).send("Memorial not found or not published.");
    }

    res.render("memorial-public", { memorial });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong loading this memorial.");
  }
};

// Light a candle (public, no auth required)
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
