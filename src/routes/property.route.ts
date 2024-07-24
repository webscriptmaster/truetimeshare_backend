import express from "express";

import propertyController from "../controllers/property.controller";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = express.Router();

router.post("/create", authMiddleware, propertyController.create);
router.get("/get/:id", authMiddleware, propertyController.get);
router.get("/get-all", authMiddleware, propertyController.getAll);
router.put("/update", authMiddleware, propertyController.update);

export default router;
