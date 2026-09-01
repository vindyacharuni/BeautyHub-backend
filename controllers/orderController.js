import Order from "../models/order.js";
import Product from "../models/product.js";
import { isResourceOwnerOrAdmin } from "../middleware/authMiddleware.js";

export async function createOrder(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "please login to place an order" });
        }

        const lastOrder = await Order.find().sort({ date: -1 }).limit(1);
        let orderId = "CB00202";
        if (lastOrder.length > 0) {
            const lastOrderIdString = lastOrder[0].orderId || "";
            const lastOrderIdNumber = parseInt(lastOrderIdString.replace(/^CB/, "")) || 0;
            const newOrderIdNumber = lastOrderIdNumber + 1;
            orderId = "CB" + newOrderIdNumber.toString().padStart(5, "0");
        }

        const itemsInput = req.body.items;
        if (!itemsInput || !Array.isArray(itemsInput) || itemsInput.length === 0) {
            return res.status(400).json({ message: "Items are required to place an order" });
        }

        const items = [];
        const updatedProducts = [];

        try {
            for (const it of itemsInput) {
                const { productId, quantity } = it;
                if (!productId || typeof quantity !== "number") {
                    throw new Error(`Invalid item format: productId and quantity required`);
                }
                if (quantity <= 0) {
                    throw new Error(`Item quantity must be at least 1`);
                }

                // Perform atomic update: decrement stock only if stock is sufficient (>= quantity)
                const product = await Product.findOneAndUpdate(
                    { productId: productId, stock: { $gte: quantity } },
                    { $inc: { stock: -quantity } },
                    { new: true }
                );

                if (!product) {
                    const exists = await Product.findOne({ productId: productId });
                    if (!exists) {
                        throw new Error(`Product not found: ${productId}`);
                    } else {
                        throw new Error(`Insufficient stock for product: ${exists.name || productId}. Available: ${exists.stock}`);
                    }
                }

                // Track successfully updated products for potential rollback
                updatedProducts.push({ productId, quantity });

                const name = product.name || "";
                const price = typeof product.price === 'number' ? product.price : 0;
                const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "";

                items.push({ productId, quantity, name, price, image });
            }
        } catch (err) {
            // Rollback inventory changes for already processed items if checking/updating fails
            for (const rolledBack of updatedProducts) {
                await Product.updateOne(
                    { productId: rolledBack.productId },
                    { $inc: { stock: rolledBack.quantity } }
                );
            }
            return res.status(400).json({ message: err.message });
        }

        const total = items.reduce((sum, it) => sum + it.quantity * (typeof it.price === 'number' ? it.price : 0), 0);

        const order = new Order({
            orderId: orderId,
            email: req.user.email,
            name: req.user.firstName + " " + req.user.lastName,
            address: req.body.address || "",
            phone: req.body.phone || "",
            items: items,
            note: req.body.note || undefined,
            total: total,
        });

        const result = await order.save();
        res.json({ message: "Order created successfully", result: result });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Error creating order", error: error.message });
    }
}
export async function getOrders(req,res){
    try{
        if(!req.user){
            return res.status(401).json({ message: "Please login to view orders" });
        }

        let orders;
        if(req.user.role && req.user.role === 'admin'){
            orders = await Order.find().sort({ date: -1 });
        } else {
            orders = await Order.find({ email: req.user.email }).sort({ date: -1 });
        }

        return res.json({ orders });
    }catch(error){
        console.error('Error fetching orders:', error);
        return res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
}

export async function getOrderById(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: Please login to view order" });
        }

        const orderId = String(req.params.orderId || "");
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Verify Ownership: Only owner or admin allowed
        if (!isResourceOwnerOrAdmin(req, order.email)) {
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this order" });
        }

        return res.json({ order });
    } catch (error) {
        console.error("Error fetching order by ID:", error);
        return res.status(500).json({ message: "Error fetching order", error: error.message });
    }
}
