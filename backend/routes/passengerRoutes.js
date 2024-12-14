const express = require('express');
const router = express.Router();
const Passenger = require('../models/Passenger');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

router.post('/signup', async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const existingUser = await Passenger.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newPassenger = new Passenger({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    await newPassenger.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Passenger.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ message: 'Login successful', user: { id: user._id, name: user.name } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  try {
    const passenger = await Passenger.findOne({ email });
    if (!passenger) {
      return res.status(404).json({ message: 'Passenger not found.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000);
    const tokenExpiry = Date.now() + 15 * 60 * 1000;

    passenger.resetToken = resetToken;
    passenger.resetCode = resetCode;
    passenger.tokenExpiry = tokenExpiry;
    await passenger.save();  
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      secure: true,
      port: 465,
    });


    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      text: `Your password reset code is: ${resetCode}`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Reset code sent to email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/changepassword', async (req, res) => {
  const { resetCode, newPassword } = req.body;

  try {
    const passenger = await Passenger.findOne({ resetCode });

    if (!passenger || passenger.tokenExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    passenger.password = hashedPassword;
    passenger.resetToken = null;
    passenger.resetCode = null;
    passenger.tokenExpiry = null;

    await passenger.save();

    res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});


module.exports = router;



