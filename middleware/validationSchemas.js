import { z } from "zod";
import { validateExternalUrl } from "../utils/ssrfGuard.js";

// ====================================================
// User Authentication Schemas
// ====================================================

const passwordComplexitySchema = z.string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character");

export const registerSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: passwordComplexitySchema,
        firstName: z.string({ required_error: "First name is required" }).min(1, "First name is required"),
        lastName: z.string({ required_error: "Last name is required" }).min(1, "Last name is required"),
        phone: z.string().optional()
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        password: z.string({ required_error: "Password is required" }).min(1, "Password is required")
    })
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format")
    })
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
        otp: z.string({ required_error: "OTP verification code is required" }).min(4, "Invalid OTP code"),
        newPassword: passwordComplexitySchema
    })
});

// ====================================================
// Product Schemas
// ====================================================

const imageUrlSchema = z.string().refine(url => {
    if (!url || url.startsWith('/')) return true;
    const check = validateExternalUrl(url);
    return check.valid;
}, { message: "Image URL must be from an allowed domain (e.g. pixabay, unsplash, google) or local asset path" });

const singleProductSchema = z.object({
    productId: z.string({ required_error: "productId is required" }).min(1, "productId is required"),
    name: z.string({ required_error: "Product name is required" }).min(1, "Product name is required"),
    altNames: z.array(z.string()).optional(),
    labelledPrice: z.number({ required_error: "Labelled price is required" }).nonnegative("Price must be non-negative"),
    price: z.number({ required_error: "Price is required" }).nonnegative("Price must be non-negative"),
    images: z.array(imageUrlSchema).optional(),
    description: z.string().optional(),
    stock: z.number({ required_error: "Stock count is required" }).int().nonnegative("Stock must be non-negative integer"),
    isAvailable: z.boolean().optional(),
    category: z.string().optional()
});

export const createProductSchema = z.object({
    body: z.union([
        singleProductSchema,
        z.array(singleProductSchema).min(1, "Products array cannot be empty")
    ])
});

export const updateProductSchema = z.object({
    params: z.object({
        productId: z.string().min(1, "productId parameter is required")
    }),
    body: z.object({
        name: z.string().optional(),
        altNames: z.array(z.string()).optional(),
        labelledPrice: z.number().nonnegative().optional(),
        price: z.number().nonnegative().optional(),
        images: z.array(imageUrlSchema).optional(),
        description: z.string().optional(),
        stock: z.number().int().nonnegative().optional(),
        isAvailable: z.boolean().optional(),
        category: z.string().optional()
    })
});

export const productIdParamSchema = z.object({
    params: z.object({
        productId: z.string({ required_error: "productId is required" }).min(1, "productId parameter is required")
    })
});

// ====================================================
// Order Schemas
// ====================================================

export const createOrderSchema = z.object({
    body: z.object({
        address: z.string({ required_error: "Shipping address is required" }).min(1, "Shipping address is required"),
        phone: z.string({ required_error: "Contact phone number is required" }).min(1, "Contact phone number is required"),
        items: z.array(
            z.object({
                productId: z.string({ required_error: "productId is required" }).min(1, "productId is required"),
                quantity: z.number({ required_error: "Quantity is required" }).int().positive("Quantity must be at least 1")
            })
        ).min(1, "At least one item is required in the order"),
        note: z.string().optional()
    })
});
