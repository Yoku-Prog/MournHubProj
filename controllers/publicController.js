const Memorial = require('../models/Memorial');

exports.viewPublicMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      slug: req.params.slug,
      isPublic: true
    });

    if (!memorial) {
      return res.status(404).send('Memorial not found or not published.');
    }

    res.render('memorial-public', { memorial });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong loading this memorial.');
  }
};