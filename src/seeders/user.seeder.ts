import { genSaltSync, hashSync } from "bcryptjs";

import { USER_ROLES, USER_STATUS } from "../utils/const.util";
import { User } from "../models/user.model";
import defaultConfig from "../config/default.config";

export default async function seedUsers() {
  const salt = genSaltSync(defaultConfig.bcrypt.salt);

  await User.deleteMany({});

  const adminUsers = [
    {
      role: USER_ROLES.ADMIN,
      email: "michael@kneeshaw.dev",
      phone: "",
      password: hashSync("1qazxsw2", salt),
      firstName: "Michael",
      lastName: "Kneeshaw",
      status: USER_STATUS.ACTIVE
    }
  ];

  await User.insertMany(adminUsers);
}
