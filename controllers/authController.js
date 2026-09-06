const bcrypt = require('bcrypt');
const User = require('../models/User');

// Show register page
exports.getRegister = (req, res) => {
  res.render('register', { error: null });
};

// Handle registration
exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.render('register', { error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.render('register', { error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.render('register', { error: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('register', { error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();

    // Auto-login after registration
    req.session.userId = newUser._id;
    req.session.userName = newUser.name;

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Something went wrong. Please try again.' });
  }
};

// Show login page
exports.getLogin = (req, res) => {
  res.render('login', { error: null });
};

// Handle login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', { error: 'All fields are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    req.session.userName = user.name;

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Something went wrong. Please try again.' });
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};