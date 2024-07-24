import express from "express";

import authRoutes from "./auth.route";
import userRoutes from "./user.route";

import adminMiddleware from "../../middleware/admin.middleware";

const router = express.Router();

router.use("/auth", authRoutes);

router.use("/user", adminMiddleware, userRoutes);

export default router;
