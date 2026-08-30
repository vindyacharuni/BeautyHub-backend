import User from "../models/user.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Order from "../models/order.js";
import Product from "../models/product.js";
import nodemailer from "nodemailer";

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

export function loginUser(req,res){
    const email=req.body.email;
    const password=req.body.password;

    User.findOne(
        {
            email:email
        }).then((user)=>{
            if(user==null){
                res.status(404).json({
                    message:"User not found"
            })}else{
                const isPasswordCorrect=bcrypt.compareSync(password,user.password);
                if(isPasswordCorrect){
                    const token=jwt.sign(
                    {
                        email:user.email,
                        firstName:user.firstName,
                        lastName:user.lastName,
                        role:user.role,
                        isBlocked:user.isBlocked,
                        isemailVerified:user.isemailVerified,
                       image:user.profilePicture
                    },
                   process.env.JWT_SECRET
                )
                    res.json({
                        token:token,
                        message:"Login successful"
                    })
                }else{
                    res.status(403).json({
                        message:"Invalid password"
                    })
                }
            }
       

        })
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
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!response.ok) {
            return res.status(400).json({ message: "Invalid Google token" });
        }

        const payload = await response.json();
        const { email, given_name, family_name, picture } = payload;

        if (!email) {
            return res.status(400).json({ message: "Email not provided by Google account" });
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

        const backendToken = jwt.sign(
            {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isBlocked: user.isBlocked,
                isemailVerified: user.isemailVerified,
                image: user.profilePicture
            },
            process.env.JWT_SECRET
        );

        res.json({
            token: backendToken,
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
    const user = await User.findOne({ email });
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