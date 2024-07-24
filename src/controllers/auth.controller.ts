import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { customAlphabet, nanoid } from "nanoid";

import { verify } from "jsonwebtoken";
import { IUser, User } from "../models/user.model";
import { IRegisterToken, RegisterToken } from "../models/register-token.model";
import {
  APP_ENV,
  SIGN_MODE,
  SITE_TITLE,
  USER_ROLES,
  USER_STATUS
} from "../utils/const.util";
import defaultConfig from "../config/default.config";
import { sendEmail } from "../services/email.service";
import { sendSMS } from "../services/sms.service";
import { RefreshToken } from "../models/refresh-token.model";
import { IResetToken, ResetToken } from "../models/reset-token.model";

/**
 * Login by email
 *
 * @param req
 * @param res
 * @param _next
 */
async function loginByEmail(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  try {
    const user: IUser = await User.findOne({ email }).select("+password");

    if (
      user &&
      user.status === USER_STATUS.ACTIVE &&
      user.comparePassword(password)
    ) {
      await RefreshToken.deleteMany({
        userId: user._id
      });

      const expiry = new Date();
      expiry.setHours(
        expiry.getHours() + defaultConfig.jwt.refresh.expiry_hour
      );
      const refreshToken = new RefreshToken({
        userId: user._id,
        token: user.generateRefreshToken(),
        expiry
      });
      await refreshToken.save();

      res.status(httpStatus.OK).json({
        user,
        accessToken: user.generateAccessToken(),
        refreshToken: refreshToken.token
      });
    } else {
      res
        .status(httpStatus.UNAUTHORIZED)
        .json({ success: false, msg: "Authentication failed." });
    }
  } catch (error) {
    console.error("auth.controller loginByEmail error: ", error);
  } finally {
    next();
  }
}

/**
 * Login by phone
 *
 * @param req
 * @param res
 * @param _next
 */
async function loginByPhone(req: Request, res: Response, next: NextFunction) {
  const { phone, password } = req.body;

  try {
    const user: IUser = await User.findOne({ phone }).select("+password");

    if (
      user &&
      user.status === USER_STATUS.ACTIVE &&
      user.comparePassword(password)
    ) {
      await RefreshToken.deleteMany({
        userId: user._id
      });

      const expiry = new Date();
      expiry.setHours(
        expiry.getHours() + defaultConfig.jwt.refresh.expiry_hour
      );

      const refreshToken = new RefreshToken({
        userId: user._id,
        token: user.generateRefreshToken(),
        expiry
      });
      await refreshToken.save();

      res.status(httpStatus.OK).json({
        user,
        accessToken: user.generateAccessToken(),
        refreshToken: refreshToken.token
      });
    } else {
      res
        .status(httpStatus.UNAUTHORIZED)
        .json({ success: false, msg: "Authentication failed." });
    }
  } catch (error) {
    console.error("auth.controller loginByPhone error: ", error);
  } finally {
    next();
  }
}

/**
 * logout
 *
 * @param req
 * @param res
 * @param next
 */
async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await RefreshToken.deleteMany({
      userId: req.user?._id
    });

    res.status(httpStatus.OK).json({
      success: true
    });
  } catch (error) {
    console.error("auth.controller logout error: ", error);
  } finally {
    next();
  }
}

/**
 * Register a user
 *
 * @param req
 * @param res
 * @param _next
 */
async function register(req: Request, res: Response, next: NextFunction) {
  const { mode, email, phone, password } = req.body;

  try {
    if (mode === SIGN_MODE.EMAIL) {
      const existing = await User.findOne({ email });

      if (existing) {
        if (existing.status === USER_STATUS.PENDING) {
          await RegisterToken.deleteMany({ userId: existing._id });
          await User.deleteOne({ email, status: USER_STATUS.PENDING });
        } else {
          res.status(httpStatus.CONFLICT).json({
            success: false,
            msg: "Email is already in use."
          });
          return;
        }
      }

      const user = new User({
        role: USER_ROLES.OWNER,
        email,
        password,
        status: USER_STATUS.PENDING
      });

      await user.save();

      const token = nanoid();
      const code = customAlphabet("0123456789", 4)();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + defaultConfig.signup.expiry_hour);

      const registerToken = new RegisterToken({
        token,
        mode,
        userId: user._id,
        code,
        expiry,
        accepted: false
      });

      await registerToken.save();

      if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
        await sendEmail({
          to: email,
          subject: `Welcome to ${SITE_TITLE}`,
          text: `Hi. Welcome to ${SITE_TITLE}. To complete your sign-up, please click following link. ${defaultConfig.app.frontend}/verify/${token}`,
          html: `Hi. Welcome to ${SITE_TITLE}. To complete your sign-up, please click following link. ${defaultConfig.app.frontend}/verify/${token}`
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        msg: "You have been successfully registered."
      });
    }

    if (mode === SIGN_MODE.PHONE) {
      const existing = await User.findOne({ phone });

      if (existing) {
        if (existing.status === USER_STATUS.PENDING) {
          await RegisterToken.deleteMany({ userId: existing._id });
          await User.deleteOne({ phone, status: USER_STATUS.PENDING });
        } else {
          res.status(httpStatus.CONFLICT).json({
            success: false,
            msg: "Phone is already in use."
          });
          return;
        }
      }

      const user = new User({
        role: USER_ROLES.OWNER,
        phone,
        password: "",
        status: USER_STATUS.PENDING
      });

      await user.save();

      const token = nanoid();
      const code = customAlphabet("0123456789", 4)();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + defaultConfig.signup.expiry_hour);

      const registerToken = new RegisterToken({
        token,
        mode,
        userId: user._id,
        code,
        expiry,
        accepted: false
      });

      await registerToken.save();

      if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
        await sendSMS({
          to: `+${phone}`,
          body: `Your ${SITE_TITLE} verification code is: ${code}`
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Verification code has been sent via your phone."
      });
    }
  } catch (error) {
    console.error("auth.controller register error: ", error);
  } finally {
    next();
  }
}

/**
 * Register from landing page
 *
 * @param req
 * @param res
 * @param _next
 */
async function registerFromLanding(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.status === USER_STATUS.PENDING) {
        await RegisterToken.deleteMany({ userId: existing._id });
        await User.deleteOne({ email, status: USER_STATUS.PENDING });
      } else {
        res.status(httpStatus.CONFLICT).json({
          success: false,
          msg: "Email is already in use."
        });
        return;
      }
    }

    const user = new User({
      role: USER_ROLES.OWNER,
      email,
      firstName,
      lastName,
      password,
      status: USER_STATUS.PENDING
    });

    await user.save();

    const token = nanoid();
    const code = customAlphabet("0123456789", 4)();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + defaultConfig.signup.expiry_hour);

    const registerToken = new RegisterToken({
      token,
      mode: SIGN_MODE.EMAIL,
      userId: user._id,
      code,
      expiry,
      accepted: false
    });

    await registerToken.save();

    if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
      await sendEmail({
        to: email,
        subject: `Welcome to ${SITE_TITLE}`,
        text: `Hi. Welcome to ${SITE_TITLE}. To complete your sign-up, please click following link. ${defaultConfig.app.frontend}/verify/${token}`,
        html: `Hi. Welcome to ${SITE_TITLE}. To complete your sign-up, please click following link. ${defaultConfig.app.frontend}/verify/${token}`
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      msg: "We've just emailed you the confirmation link. Please check your inbox."
    });
  } catch (error) {
    console.error("auth.controller register error: ", error);
  } finally {
    next();
  }
}

/**
 * verify register token
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function verifyRegisterToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { token } = req.body;

  try {
    const registerToken: IRegisterToken | null = await RegisterToken.findOne({
      token
    });

    if (!registerToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token not found."
      });
      return;
    }

    if (registerToken) {
      if (registerToken.expiry < new Date()) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Token is expired."
        });
        return;
      }

      if (registerToken.accepted) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Token is already accepted."
        });
        return;
      }

      await RegisterToken.findOneAndUpdate(
        { token },
        { accepted: true },
        { new: true }
      );

      await User.findOneAndUpdate(
        { _id: registerToken.userId },
        { status: USER_STATUS.ACTIVE },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        msg: "You have been successfully verified."
      });
    }
  } catch (error) {
    console.error("auth.controller verifyRegisterEmail error: ", error);
  } finally {
    next();
  }
}

/**
 * verify registration by sms code
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function verifyRegisterCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone, code } = req.body;

  try {
    const user = await User.findOne({ phone });

    const registerToken: IRegisterToken | null = await RegisterToken.findOne({
      userId: user?._id
    });

    if (!registerToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Verification code not found."
      });
      return;
    }

    if (registerToken) {
      if (registerToken.expiry < new Date()) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is expired."
        });
        return;
      }

      if (registerToken.accepted) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is already used."
        });
        return;
      }

      if (registerToken.code !== code) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is incorrect."
        });
        return;
      }

      await RegisterToken.findOneAndUpdate(
        { token: registerToken.token },
        { accepted: true },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        msg: "You have been successfully verified."
      });
    }
  } catch (error) {
    console.error("auth.controller verifyRegisterCode error: ", error);
  } finally {
    next();
  }
}

/**
 * resend registration sms code
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function resendRegisterCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone });

    const registerToken: IRegisterToken | null = await RegisterToken.findOne({
      userId: user?._id
    });

    if (registerToken) {
      const code = customAlphabet("0123456789", 4)();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + defaultConfig.signup.expiry_hour);

      await RegisterToken.findOneAndUpdate(
        { token: registerToken.token },
        { code, expiry, accepted: false },
        { new: true }
      );

      if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
        await sendSMS({
          to: `+${phone}`,
          body: `Your ${SITE_TITLE} verification code is: ${code}`
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Verification code has been sent via your phone."
      });
    }
  } catch (error) {
    console.error("auth.controller resendRegisterCode error: ", error);
  } finally {
    next();
  }
}

/**
 * update register password
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function updateRegisterPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({ phone });

    const registerToken: IRegisterToken | null = await RegisterToken.findOne({
      userId: user?._id
    });

    const salt = genSaltSync(defaultConfig.bcrypt.salt);
    const hashedPassword = hashSync(password, salt);

    if (registerToken && registerToken.accepted) {
      await User.findOneAndUpdate(
        { phone },
        { password: hashedPassword, status: USER_STATUS.ACTIVE },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        msg: "You have been successfully verified."
      });
    }
  } catch (error) {
    console.error("auth.controller updateRegisterPassword error: ", error);
  } finally {
    next();
  }
}

/**
 * refresh token
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function regenerateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { refreshToken } = req.body;

  try {
    const token = await RefreshToken.findOne({ token: refreshToken });

    if (!token) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Refresh token not found."
      });
      return;
    }

    if (token && token.expiry < new Date()) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Refresh token is expired."
      });
      return;
    }

    let decodedUser = verify(refreshToken, defaultConfig.jwt.refresh.secret);
    decodedUser = decodedUser as IUser;

    if (decodedUser._id !== token.userId) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Refresh token is invalid."
      });
      return;
    }

    const user: IUser | null = await User.findOne({ userId: decodedUser._id });
    if (!user) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "User doesn't exist."
      });
      return;
    }

    await RefreshToken.deleteMany({ userId: decodedUser._id });

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + defaultConfig.jwt.refresh.expiry_hour);
    const newRefreshToken = new RefreshToken({
      userId: decodedUser._id,
      token: user.generateRefreshToken(),
      expiry
    });
    await newRefreshToken.save();

    res.status(httpStatus.OK).json({
      success: true,
      accessToken: user.generateAccessToken(),
      refreshToken: newRefreshToken.token
    });
  } catch (error) {
    console.error("auth.controller regenerateToken error: ", error);
  } finally {
    next();
  }
}

/**
 * send reset link via email
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function sendResetLink(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email, status: USER_STATUS.ACTIVE });

    if (!user) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "User doesn't exist."
      });
      return;
    }

    await ResetToken.deleteMany({ userId: user._id });

    const token = nanoid();
    const code = customAlphabet("0123456789", 4)();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + defaultConfig.forgot.expiry_hour);

    const resetToken = new ResetToken({
      token,
      userId: user._id,
      code,
      expiry,
      accepted: false
    });

    await resetToken.save();

    if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
      await sendEmail({
        to: email,
        subject: `Welcome to ${SITE_TITLE}`,
        text: `Hi. Welcome to ${SITE_TITLE}. To reset your password, please click following link. ${defaultConfig.app.frontend}/reset/${token}`,
        html: `Hi. Welcome to ${SITE_TITLE}. To reset your password, please click following link. ${defaultConfig.app.frontend}/reset/${token}`
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      msg: "Password reset link has been successfully sent."
    });
  } catch (error) {
    console.error("auth.controller sendResetLink error: ", error);
  } finally {
    next();
  }
}

/**
 * verify reset token
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function verifyResetToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { token } = req.body;

  try {
    const resetToken: IResetToken | null = await ResetToken.findOne({
      token
    });

    if (!resetToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token not found."
      });
      return;
    }

    if (resetToken) {
      if (resetToken.expiry < new Date()) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Token is expired."
        });
        return;
      }

      if (resetToken.accepted) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Token is already used."
        });
        return;
      }

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Please reset your password."
      });
    }
  } catch (error) {
    console.error("auth.controller verifyResetToken error: ", error);
  } finally {
    next();
  }
}

/**
 * reset password by token
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function resetPasswordByToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { token, password } = req.body;

  try {
    const resetToken = await ResetToken.findOne({ token });
    if (!resetToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token not found."
      });
      return;
    }

    if (resetToken.expiry < new Date()) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token is expired."
      });
      return;
    }

    const user = await User.findOne({ _id: resetToken.userId });
    if (!user) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "User not found."
      });
      return;
    }

    const salt = genSaltSync(defaultConfig.bcrypt.salt);
    const hashedPassword = hashSync(password, salt);

    await ResetToken.findOneAndUpdate(
      { token },
      { accepted: true },
      { new: true }
    );

    await User.findOneAndUpdate(
      { _id: resetToken.userId },
      { password: hashedPassword },
      { new: true }
    );

    res.status(httpStatus.OK).json({
      success: true,
      msg: "Your password has been successfully reset."
    });
  } catch (error) {
    console.error("auth.controller resetPasswordByToken error: ", error);
  } finally {
    next();
  }
}

/**
 * send reset code via phone
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function sendResetCode(req: Request, res: Response, next: NextFunction) {
  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone, status: USER_STATUS.ACTIVE });

    if (!user) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "User doesn't exist."
      });
      return;
    }

    await ResetToken.deleteMany({ userId: user._id });

    const token = nanoid();
    const code = customAlphabet("0123456789", 4)();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + defaultConfig.forgot.expiry_hour);

    const resetToken = new ResetToken({
      token,
      userId: user._id,
      code,
      expiry,
      accepted: false
    });

    await resetToken.save();

    if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
      await sendSMS({
        to: `+${phone}`,
        body: `Your ${SITE_TITLE} verification code is: ${code}`
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      msg: "Verification code for reset password has been sent via your phone."
    });
  } catch (error) {
    console.error("auth.controller sendResetCode error: ", error);
  } finally {
    next();
  }
}

/**
 * verify reset code
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function verifyResetCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone, code } = req.body;

  try {
    const user = await User.findOne({ phone });

    const resetToken = await ResetToken.findOne({
      userId: user?._id
    });

    if (!resetToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Verification code not found."
      });
      return;
    }

    if (resetToken) {
      if (resetToken.expiry < new Date()) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is expired."
        });
        return;
      }

      if (resetToken.accepted) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is already used."
        });
        return;
      }

      if (resetToken.code !== code) {
        res.status(httpStatus.NOT_ACCEPTABLE).json({
          success: false,
          msg: "Verification code is incorrect."
        });
        return;
      }

      await ResetToken.findOneAndUpdate(
        { token: resetToken.token },
        { accepted: true },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        msg: "You have been successfully verified."
      });
    }
  } catch (error) {
    console.error("auth.controller verifyResetCode error: ", error);
  } finally {
    next();
  }
}

/**
 * resend reset code
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function resendResetCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone } = req.body;

  try {
    const user = await User.findOne({ phone });

    const resetToken = await ResetToken.findOne({
      userId: user?._id
    });

    if (resetToken) {
      const code = customAlphabet("0123456789", 4)();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + defaultConfig.signup.expiry_hour);

      await ResetToken.findOneAndUpdate(
        { token: resetToken.token },
        { code, expiry, accepted: false },
        { new: true }
      );

      if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
        await sendSMS({
          to: `+${phone}`,
          body: `Your ${SITE_TITLE} verification code is: ${code}`
        });
      }

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Verification code has been sent via your phone."
      });
    }
  } catch (error) {
    console.error("auth.controller resendResetCode error: ", error);
  } finally {
    next();
  }
}

/**
 * update reset password
 *
 * @param req
 * @param res
 * @param _next
 * @returns
 */
async function resetPasswordByPhone(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone, password } = req.body;

  try {
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "User not found."
      });
      return;
    }

    const resetToken = await ResetToken.findOne({
      userId: user?._id
    });

    if (!resetToken) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token not found."
      });
      return;
    }

    if (!resetToken.accepted) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "You didn't pass the code verification."
      });
      return;
    }

    if (resetToken.expiry < new Date()) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Token is expired."
      });
      return;
    }

    const salt = genSaltSync(defaultConfig.bcrypt.salt);
    const hashedPassword = hashSync(password, salt);

    if (resetToken && resetToken.accepted) {
      await User.findOneAndUpdate(
        { phone },
        { password: hashedPassword },
        { new: true }
      );

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Your password has been successfully reset."
      });
    }
  } catch (error) {
    console.error("auth.controller resetPasswordByPhone error: ", error);
  } finally {
    next();
  }
}

export default {
  // Login
  loginByEmail,
  loginByPhone,

  // Logout
  logout,

  // Refresh token
  regenerateToken,

  // Register
  register,
  registerFromLanding,

  // Register via email
  verifyRegisterToken,

  // Register via phone
  verifyRegisterCode,
  resendRegisterCode,
  updateRegisterPassword,

  // Reset via email
  sendResetLink,
  verifyResetToken,
  resetPasswordByToken,

  // Reset via phone
  sendResetCode,
  resendResetCode,
  verifyResetCode,
  resetPasswordByPhone
};
