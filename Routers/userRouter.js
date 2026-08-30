import express from 'express';
import { createUser, loginUser, registerUser, getDashboardStats, googleLogin, forgotPassword, resetPassword } from '../controllers/userController.js';
const userRouter = express.Router();
userRouter.post('/', (createUser))
userRouter.post('/login', (loginUser))
userRouter.post('/register', registerUser)
userRouter.post('/google-login', googleLogin)
userRouter.get('/dashboard-stats', getDashboardStats)
userRouter.post('/forgot-password', forgotPassword)
userRouter.post('/reset-password', resetPassword)

export default userRouter;