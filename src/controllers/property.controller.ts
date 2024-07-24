import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";

import { Property } from "../models/property.model";
import upload from "../services/upload.service";

/**
 * Create a property
 *
 * @param req
 * @param res
 * @param _next
 */
async function create(req: Request, res: Response, next: NextFunction) {
  upload("property").array("images[]")(req, res, async (err) => {
    if (err) {
      res.status(httpStatus.NOT_ACCEPTABLE).json({
        success: false,
        msg: "Something went wrong while uploading images",
        code: err.code
      });
      return;
    }

    const images: string[] = [];
    if (Array.isArray(req.files)) {
      req.files.forEach((f: Express.Multer.File) => {
        images.push(f.path.replace(/\\/g, "/"));
      });
    }

    const {
      name,
      type,
      location,
      price,
      description,
      checkin,
      checkout,
      additional
    } = req.body;

    try {
      const property = new Property({
        ownerId: req.user?._id,
        name,
        type,
        location,
        price,
        description,
        images,
        checkin,
        checkout,
        additional
      });

      await property.save();

      res.status(httpStatus.OK).json({
        success: true,
        msg: "Property created successfully"
      });
    } catch (error) {
      console.error("property.controller create error: ", error);
    } finally {
      next();
    }
  });
}

/**
 * Get a property
 *
 * @param req
 * @param res
 * @param next
 */
async function get(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;

  try {
    const property = await Property.findById(id);

    res.status(httpStatus.OK).json({
      success: true,
      property
    });
  } catch (error) {
    console.error("property.controller get error: ", error);
  } finally {
    next();
  }
}

/**
 * Get all properties
 *
 * @param req
 * @param res
 * @param next
 */
async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const properties = await Property.find({ ownerId: req.user?._id });

    res.status(httpStatus.OK).json({
      success: true,
      properties
    });
  } catch (error) {
    console.error("property.controller getAll error: ", error);
  } finally {
    next();
  }
}

/**
 * Update a property
 *
 * @param req
 * @param res
 * @param next
 */
async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      propertyId,
      checkin,
      checkout,
      price,
      openingStatus,
      openingAdditional
    } = req.body;

    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        msg: "Property not found"
      });
      return;
    }

    await Property.findByIdAndUpdate(
      propertyId,
      { checkin, checkout, price, openingStatus, openingAdditional },
      { new: true }
    );

    res.status(httpStatus.OK).json({
      success: true,
      msg: "Property updated successfully"
    });
  } catch (error) {
    console.error("property.controller update error: ", error);
  } finally {
    next();
  }
}

export default {
  create,
  get,
  getAll,
  update
};
