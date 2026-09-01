import User from "../models/user.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Order from "../models/order.js";
import Product from "../models/product.js";
import nodemailer from "nodemailer";
import redisClient from "../config/redis.js";
import { blacklistToken } from "../middleware/authMiddleware.js";
import { logAuthEvent } from "../utils/authLogger.js";
import { safeFetch } from "../utils/ssrfGuard.js";

function generateTokens(user, res) {
    const payload = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isBlocked: user.isBlocked,
        isemailVerified: user.isemailVerified,
        image: user.profilePicture
    };

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "cbc-6503";
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || "beautyhub_refresh_secret_key_2026";

    // 15-minute access token
    const accessToken = jwt.sign(payload, accessTokenSecret, { expiresIn: '15m' });

    // 7-day refresh token
    const refreshToken = jwt.sign({ email: user.email }, refreshTokenSecret, { expiresIn: '7d' });

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { accessToken, refreshToken, payload };
}

export function createUser(req, res) {
    if(req.user==null){
        return res.status(403).json({
            message: "Please login to create a user"
        })
        return  

    }
    if(req.user.role!="admin"){
        return res.status(403).json({
            message: "Only admin can create a user"
        })
        return
    }
    const passwordHash=bcrypt.hashSync(req.body.password,10)

    const userData={
        firstName:req.body.firstName,
        lastName:req.body.lastName,
        email:req.body.email,
        password:passwordHash,
        phone:req.body.phone
    }

const user=new User(userData)
    
user.save().then(()=>{
    res.json(
        {
            message:"User created successfully"
        }
    )
}).catch((error)=>{
    res.status(500).json(
        {
            message:"Error creating user"
        }
    )
})}
export function isAdmin(req){
    if(req.user==null){
        return false
    }
    if(req.user.role=="admin"){
        return true
    }else{
        return false
    }
}

export async function loginUser(req, res) {
    const email = String(req.body.email || "");
    const password = req.body.password;

    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if account is blocked or temporarily locked
        if (user.isBlocked) {
            return res.status(403).json({ message: "Account is blocked. Please contact support." });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            const remainingMins = Math.ceil((user.lockUntil - new Date()) / 60000);
            return res.status(423).json({
                message: `Account locked due to 5 consecutive failed login attempts. Please try again in ${remainingMins} minute(s).`
            });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (isPasswordCorrect) {
            // Reset failed login attempts and lock window on success
            if (user.failedLoginAttempts > 0 || user.lockUntil) {
                user.failedLoginAttempts = 0;
                user.lockUntil = undefined;
                await user.save();
            }

            const { accessToken, payload } = generateTokens(user, res);
            logAuthEvent({ event: "LOGIN_SUCCESS", email: user.email, ip: req.ip, status: "SUCCESS" });
            return res.json({
                token: accessToken,
                accessToken: accessToken,
                user: payload,
                message: "Login successful"
            });
        } else {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            user.failedLoginAttempts = attempts;

            if (attempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
                user.failedLoginAttempts = 0;
                await user.save();
                logAuthEvent({ event: "ACCOUNT_LOCKED", email: user.email, ip: req.ip, status: "LOCKED", details: "Maximum 5 failed attempts reached" });
                return res.status(423).json({
                    message: "Account locked! Maximum 5 failed login attempts reached. Account locked for 15 minutes."
                });
            } else {
                await user.save();
                const remaining = 5 - attempts;
                logAuthEvent({ event: "LOGIN_FAILED", email: user.email, ip: req.ip, status: "FAILURE", details: `${remaining} attempts remaining` });
                return res.status(403).json({
                    message: `Invalid password. ${remaining} attempt(s) remaining before account lockout.`
                });
            }
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ message: "Error logging in user", error: error.message });
    }
}

export function registerUser(req, res) {
    const { firstName, lastName, email, password, phone } = req.body || {};
    
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            message: "First name, last name, email, and password are required"
        });
    }

    User.findOne({ email: email }).then((existingUser) => {
        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered"
            });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const userData = {
            firstName,
            lastName,
            email,
            password: passwordHash,
            phone: phone || "Not provided"
        };

        const user = new User(userData);
        
        user.save().then(() => {
            res.status(201).json({
                message: "Registration successful"
            });
        }).catch((error) => {
            res.status(500).json({
                message: "Error registering user"
            });
        });
    }).catch((error) => {
        res.status(500).json({
            message: "Database error occurred"
        });
    });
}

export async function getDashboardStats(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Please login to view dashboard statistics" });
        }
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can view dashboard statistics" });
        }

        // Calculate Total Revenue
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

        // Count Products
        const totalProducts = await Product.countDocuments();

        // Count Categories
        const categories = await Product.distinct("category");
        const totalCategories = categories.length;

        // Count Low Stock (under 15 units)
        const lowStockCount = await Product.countDocuments({ stock: { $lt: 15 } });

        // Count Users (role === 'user')
        const totalUsers = await User.countDocuments({ role: "user" });

        // Retrieve last 5 orders for activity logs
        const recentOrders = await Order.find().sort({ date: -1 }).limit(5);

        res.json({
            totalRevenue,
            totalProducts,
            totalCategories,
            lowStockCount,
            totalUsers,
            recentOrders
        });
    } catch (error) {
        console.error("Error fetching dashboard statistics:", error);
        res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
    }
}

export async function googleLogin(req, res) {
    const { token } = req.body || {};
    if (!token) {
        return res.status(400).json({ message: "Google token is required" });
    }

    try {
        const response = await safeFetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!response.ok) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const payload = await response.json();
        const { email, given_name, family_name, picture, email_verified } = payload || {};

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: "Email not provided by Google account" });
        }

        // Data Integrity Check: Ensure Google has verified the user's email address
        if (email_verified !== true && email_verified !== "true") {
            logAuthEvent({ event: "GOOGLE_LOGIN", email: String(email), ip: req.ip, status: "FAILURE", details: "Unverified Google email" });
            return res.status(400).json({ message: "Google account email is not verified" });
        }

        let user = await User.findOne({ email });
        if (!user) {
            const randomPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            const passwordHash = bcrypt.hashSync(randomPassword, 10);
            
            user = new User({
                firstName: given_name || "Google",
                lastName: family_name || "User",
                email: email,
                password: passwordHash,
                profilePicture: picture || undefined,
                isemailVerified: true
            });
            await user.save();
        }

        const { accessToken, payload: userPayload } = generateTokens(user, res);

        res.json({
            token: accessToken,
            accessToken: accessToken,
            user: userPayload,
            message: "Google login successful"
        });
    } catch (error) {
        console.error("Error during Google login:", error);
        res.status(500).json({ message: "Error during Google login", error: error.message });
    }
}

async function sendOTPEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: parseInt(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });

    const info = await transporter.sendMail({
      from: '"BeautyHub Support" <support@beautyhub.com>',
      to: email,
      subject: "Password Reset Verification Code",
      text: `Your password reset verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #3b2f33;">
          <h2 style="color: #6366F1;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the following 6-digit verification code:</p>
          <div style="background: #f5f5f7; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 8px; margin: 20px 0; color: #3b2f33;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #888;">This code will expire in 10 minutes. If you did not make this request, please ignore this email.</p>
        </div>
      `,
    });

    console.log("OTP email sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("Nodemailer failed to deliver email. Printing OTP directly here:");
    console.log(`=========================================`);
    console.log(`[OTP VERIFICATION CODE FOR ${email}]: ${otp}`);
    console.log(`=========================================`);
  }
}

export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
        const user = await User.findOne({ email: String(email) });
        if (!user) {
          return res.status(404).json({ message: "User with this email not found" });
        }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await user.save();

    console.log(`=========================================`);
    console.log(`[OTP VERIFICATION CODE FOR ${email}]: ${otp}`);
    console.log(`=========================================`);

    // Send email (runs asynchronously in background)
    sendOTPEmail(email, otp);

    res.json({ message: "Verification OTP code sent successfully" });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Error sending verification code", error: error.message });
  }
}

export async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP code, and new password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Update password
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    user.password = passwordHash;

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
}

export async function refreshTokenController(req, res) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
        // Check if refresh token is blacklisted in Redis
        const isBlacklisted = await redisClient.get(`bl_${refreshToken}`);
        if (isBlacklisted) {
            return res.status(401).json({ message: "Refresh token revoked" });
        }

        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || "beautyhub_refresh_secret_key_2026";
        const decoded = jwt.verify(refreshToken, refreshTokenSecret);

        const user = await User.findOne({ email: decoded.email });
        if (!user || user.isBlocked) {
            logAuthEvent({ event: "TOKEN_REFRESH", email: decoded.email, ip: req.ip, status: "BLOCKED", details: "User account blocked or missing" });
            return res.status(403).json({ message: "User account disabled or not found" });
        }

        // REFRESH TOKEN ROTATION: Blacklist current refresh token
        await blacklistToken(refreshToken, 7 * 24 * 3600);

        // Issue brand-new Access Token AND set brand-new httpOnly Refresh Token cookie
        const { accessToken, payload } = generateTokens(user, res);

        logAuthEvent({ event: "TOKEN_REFRESH", email: user.email, ip: req.ip, status: "SUCCESS", details: "Token rotated" });

        return res.json({
            accessToken: accessToken,
            token: accessToken,
            user: payload
        });
    } catch (err) {
        logAuthEvent({ event: "TOKEN_REFRESH", email: "UNKNOWN", ip: req.ip, status: "FAILURE", details: err.message });
        return res.status(401).json({ message: "Invalid or expired refresh token", error: err.message });
    }
}

export async function logoutUser(req, res) {
    const authHeader = req.header("Authorization");
    const accessToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : null;
    const refreshToken = req.cookies?.refreshToken;

    if (accessToken) {
        await blacklistToken(accessToken, 15 * 60);
    }
    if (refreshToken) {
        await blacklistToken(refreshToken, 7 * 24 * 3600);
    }

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    return res.json({ message: "Logout successful" });
}