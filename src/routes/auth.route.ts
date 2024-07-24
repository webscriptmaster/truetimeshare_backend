import express from "express";

import authController from "../controllers/auth.controller";
import authMiddleware from "../middleware/auth.middleware.ts";

const router = express.Router();

router.post("/login-by-email", authController.loginByEmail);
router.post("/login-by-phone", authController.loginByPhone);

router.post("/logout", authMiddleware, authController.logout);

router.post("/register", authController.register);
router.post("/register-from-landing", authController.registerFromLanding);

router.post("/verify-register-token", authController.verifyRegisterToken);

router.post("/verify-register-code", authController.verifyRegisterCode);
router.post("/resend-register-code", authController.resendRegisterCode);
router.post("/update-register-password", authController.updateRegisterPassword);
router.post("/regenerate-token", authController.regenerateToken);

router.post("/send-reset-link", authController.sendResetLink);
router.post("/verify-reset-token", authController.verifyResetToken);
router.post("/reset-password-by-token", authController.resetPasswordByToken);

router.post("/send-reset-code", authController.sendResetCode);
router.post("/resend-reset-code", authController.resendResetCode);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password-by-phone", authController.resetPasswordByPhone);

export default router;
