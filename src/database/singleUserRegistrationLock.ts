import mongoose, { Schema } from "mongoose";
import { ISingleUserRegistrationLockDB } from "../interfaces/auth/singleUserRegistrationInterfaces.js";

const singleUserRegistrationLockSchema =
  new Schema<ISingleUserRegistrationLockDB>(
    {
      _id: {
        type: String,
        required: true,
      },
    },
    {
      collection: "singleUserRegistrationLocks",
      timestamps: true,
    },
  );

const SingleUserRegistrationLock =
  mongoose.model<ISingleUserRegistrationLockDB>(
    "SingleUserRegistrationLock",
    singleUserRegistrationLockSchema,
  );

export default SingleUserRegistrationLock;
