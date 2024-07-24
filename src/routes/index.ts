import express, { NextFunction, Request, Response } from "express";

import authRoutes from "./auth.route";
import propertyRoutes from "./property.route";
import communityRoute from "./community.route";

import adminRoutes from "./admin";

import { SITE_TITLE } from "../utils/const.util";

const router = express.Router();

router.get("/", (_req: Request, res: Response, _next: NextFunction) => {
  res.send(`😀 Welcome to the ${SITE_TITLE} API server!`);
});

router.use("/api/auth", authRoutes);
router.use("/api/property", propertyRoutes);
router.use("/api/community", communityRoute);

router.use("/api/admin", adminRoutes);

export default router;
