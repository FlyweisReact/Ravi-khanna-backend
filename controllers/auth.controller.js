const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
var newOTP = require('otp-generators');
const jwt = require("jsonwebtoken");
const authconfig = require("../configs/auth.config");
const authConfig = require("../configs/auth.config");

exports.signup = async (req, res) => {
    try {
        const data = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: bcrypt.hashSync(req.body.password, 8),
            referalcode: newOTP.generate(16, { alphabets: true, upperCase: true, specialChar: true }),
            image: req.body.image,

        }
        if (req.body.referalcode) {
            const user1 = await User.findOne({ referalcode: req.body.referalcode });
            user1.wallet.cash += 5;
            await user1.save();
        }

        // await User.createIndex({ email: 1, phone: 1 }, { unique: true }, (err, result) => {
        //     if (err) {
        //         console.error(err);
        //         return;
        //     }
        // });
        const user = await User.create(data);
        res.status(201).send({ message: "registered successfully ", data: user });
    } catch (err) {
        console.log(err.message);
        res.status(500).send({ error: "internal server error " + err.message });
    }
}
exports.loginWithPhone = async (req, res) => {
    const { phone } = req.body;

    try {
        // Find the user in the database
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).send({ message: 'not registered' });
        }


        const userObj = {};
        userObj.otp = newOTP.generate(4, { alphabets: false, upperCase: false, specialChar: false });
        userObj.otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
        // const newUser = new User({ phone, otp, otpExpiration });

        // Delete the OTP from the database
        const updated = await User.findOneAndUpdate({
            phone: phone
        }, userObj, { new: true });

        res.status(200).send({

            userId: updated._id,
            otp: updated.otp,



        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send({ message: "user not found" });
        }
        if (user.otp !== otp || user.otpExpiration < Date.now()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        const accessToken = jwt.sign({ id: user.phone }, authConfig.secret, { expiresIn: authConfig.accessTokenTime });
        res.status(200).send({ message: "logged in successfully", accessToken: accessToken });
    } catch (err) {
        console.log(err.message);
        res.status(500).send({ error: "internal server error" + err.message });
    }
}

exports.resendOTP = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if the user already exists in the database
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(400).send({ message: 'User not found' });
        }

        // Generate a new OTP and update the OTP and OTP expiration time in the database
        const otp = generateOTP();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
        const updated = await User.findOneAndUpdate({ _id: id }, { otp, otpExpiration }, { new: true });
        console.log(updated);
        // Send the new OTP to the user's phone number
        // await sendOTP(phone, otp);

        res.status(200).send({ message: 'OTP resent', otp: otp });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' + error.message });
    }
};

exports.signin = async (req, res) => {
    try {

        const { email, password } = req.body;
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).send({ message: "user not found ! not registered" });
        }
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).send({
                message: "Wrong password",
            });
        }
        const accessToken = jwt.sign({ id: user.email }, authConfig.secret, {
            expiresIn: authConfig.accessTokenTime,
        });
        res.status(201).send({ data: user, accessToken: accessToken });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' + error.message });
    }
};




