import express from 'express';
import { 
    createUser, 
    loginUser, 
    registerUser, 
    getDashboardStats, 
    googleLogin, 
    forgotPassword, 
    resetPassword,
    refreshTokenController,
    logoutUser
} from '../controllers/userController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../middleware/validationSchemas.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const userRouter = express.Router();
userRouter.post('/', requireAuth, requireAdmin, createUser);
userRouter.post('/login', authLimiter, validate(loginSchema), loginUser);
userRouter.post('/register', authLimiter, validate(registerSchema), registerUser);
userRouter.post('/google-login', authLimiter, googleLogin);
userRouter.post('/refresh', refreshTokenController);
userRouter.post('/logout', logoutUser);
userRouter.get('/dashboard-stats', requireAuth, requireAdmin, getDashboardStats);
userRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
userRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

export default userRouter;