import express from 'express';
import mongoose from 'mongoose';   
import bodyParser from 'body-parser'; 
import cookieParser from 'cookie-parser';
import userRouter from './Routers/userRouter.js';
import orderRouter from './Routers/orderRouter.js';
import productRouter from './Routers/productRouter.js';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { sanitizeInput } from './middleware/mongoSanitizeMiddleware.js';
import { verifyToken } from './middleware/authMiddleware.js';
import { securityAlertMiddleware } from './middleware/securityAlertMiddleware.js';
import { logger } from './config/logger.js';

dotenv.config();

const app = express();

app.use(helmet());

const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', process.env.CLIENT_URL, process.env.FRONTEND_URL].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, origin);
        }
        return callback(null, origin);
    },
    credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(securityAlertMiddleware);
app.use(sanitizeInput);
app.use(verifyToken);


const connectionString=process.env.MONGO_URL;
mongoose.connect(connectionString).then
(()=>{
    console.log("Connected to MongoDB");
}).catch((error)=>{
    console.error("Error connecting to MongoDB:", error);
});


app.use('/api/users',userRouter)
app.use('/api/products',productRouter)
app.use('/api/orders',orderRouter)

// Global Express Error Handling Middleware (Logs 5xx errors via Winston)
app.use((err, req, res, next) => {
    logger.error(`[EXPRESS 5XX ERROR] ${req.method} ${req.originalUrl}: ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        stack: err.stack
    });
    res.status(err.status || 500).json({
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "production" ? undefined : err.message
    });
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
})