import express from "express";
import { createOrder, getOrders, getOrderById } from "../Controllers/orderController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "../middleware/validationSchemas.js";

const orderRouter = express.Router();
orderRouter.post("/", requireAuth, validate(createOrderSchema), createOrder);
orderRouter.get("/", requireAuth, getOrders);
orderRouter.get("/:orderId", requireAuth, getOrderById);
export default orderRouter;
