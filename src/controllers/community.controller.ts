import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

import { CommunityEmail } from "../models/community-email.model";
import { APP_ENV, SITE_TITLE } from "../utils/const.util";
import defaultConfig from "../config/default.config";
import { sendEmail } from "../services/email.service";

/**
 * Register an email on the community
 *
 * @param req
 * @param res
 * @param next
 */
async function registerEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    const communityEmail = await CommunityEmail.findOne({ email });

    if (communityEmail) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Email is already registered in our community."
      });
      return;
    }

    const newCommunityEmail = new CommunityEmail({ email });
    await newCommunityEmail.save();

    if (defaultConfig.app.env === APP_ENV.PRODUCTION) {
      await sendEmail({
        to: email,
        subject: `Welcome to ${SITE_TITLE}`,
        text: `Hi. Welcome to ${SITE_TITLE}. You have been successfully registered in our community.`,
        html: `Hi. Welcome to ${SITE_TITLE}. You have been successfully registered in our community.`
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      msg: "Email is successfully registered."
    });
  } catch (error) {
    console.error("community.controller registerEmail error: ", error);
  } finally {
    next();
  }
}

export default {
  registerEmail
};
