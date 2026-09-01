import express from "express";
import { 
    createProduct, 
    getProducts, 
    deleteProduct, 
    updateProduct, 
    getProductInfo, 
    getCategories 
} from "../controllers/productController.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createProductSchema, updateProductSchema, productIdParamSchema } from "../middleware/validationSchemas.js";

const productRouter = express.Router();

productRouter.post("/", requireAuth, requireAdmin, validate(createProductSchema), createProduct);
productRouter.get("/", cacheMiddleware("products", 300), getProducts);
productRouter.get("/categories", cacheMiddleware("categories", 300), getCategories);
productRouter.delete("/:productId", requireAuth, requireAdmin, validate(productIdParamSchema), deleteProduct);  
productRouter.put("/:productId", requireAuth, requireAdmin, validate(updateProductSchema), updateProduct);
productRouter.get("/:productId", validate(productIdParamSchema), cacheMiddleware("products", 300), getProductInfo);

export default productRouter;
