import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { Document, model, Model, Schema } from "mongoose";
import { sign } from "jsonwebtoken";

import defaultConfig from "../config/default.config";

interface IUser {
  _id?: string;
  role: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  status: string;

  comparePassword(password: string): boolean;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

interface UserDocument extends Document {
  role: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  status: string;
}

const UserSchema: Schema = new Schema(
  {
    role: {
      type: String,
      required: true
    },
    email: {
      type: String,
      unique: false,
      required: false
    },
    phone: {
      type: String,
      unique: false,
      required: false
    },
    password: {
      type: String
    },
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    status: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

UserSchema.pre<UserDocument>(
  "save",
  function preSave(this: UserDocument, next) {
    if (!this.isModified("password")) {
      next();
    }

    const salt = genSaltSync(defaultConfig.bcrypt.salt);
    this.password = hashSync(this.password, salt);
    next();
  }
);

UserSchema.methods.comparePassword = function comparePassword(
  password: string
) {
  return compareSync(password, this.password);
};

UserSchema.methods.generateAccessToken = function generateAccessToken() {
  const accessToken = sign(
    {
      _id: this._id,
      role: this.role,
      email: this.email,
      phone: this.phone,
      status: this.status
    },
    defaultConfig.jwt.access.secret,
    {
      expiresIn: `${defaultConfig.jwt.access.expiry_hour}h`
    }
  );

  return accessToken;
};

UserSchema.methods.generateRefreshToken = function generateRefreshToken() {
  const refreshToken = sign(
    {
      _id: this._id,
      role: this.role,
      email: this.email,
      phone: this.phone,
      status: this.status
    },
    defaultConfig.jwt.refresh.secret,
    {
      expiresIn: `${defaultConfig.jwt.refresh.expiry_hour}h`
    }
  );

  return refreshToken;
};

const User: Model<UserDocument> = model<UserDocument>("User", UserSchema);

export { IUser, UserDocument, User };
