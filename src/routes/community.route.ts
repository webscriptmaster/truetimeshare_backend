import express from "express";

import communityController from "../controllers/community.controller";

const router = express.Router();

router.post("/register-email", communityController.registerEmail);

export default router;
