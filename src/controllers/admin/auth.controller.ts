import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { sign } from "jsonwebtoken";

import { IUser, User } from "../../models/user.model";
import { USER_ROLES, USER_STATUS } from "../../utils/const.util";
import defaultConfig from "../../config/default.config";

async function login(req: Request, res: Response, _next: NextFunction) {
  const { email, password } = req.body;

  try {
    const user: IUser = await User.findOne({ email }).select("+password");

    if (
      user &&
      user.role === USER_ROLES.ADMIN &&
      user.status === USER_STATUS.ACTIVE &&
      user.comparePassword(password)
    ) {
      return res.status(httpStatus.OK).json({
        user,
        accessToken: sign(
          {
            _id: user._id,
            role: user.role,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status
          },
          defaultConfig.jwt.access.secret
        )
      });
    }

    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Authentication failed." });
  } catch (error) {
    console.error("admin auth.controller login error: ", error);

    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Authentication failed." });
  }
}

export default { login };
