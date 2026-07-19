import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

const cloudinaryEnvironmentSchema = z
  .object({
    CLOUDINARY_CLOUD_NAME: z.string().trim().min(1),
    CLOUDINARY_API_KEY: z.string().trim().min(1),
    CLOUDINARY_API_SECRET: z.string().trim().min(1),
  })
  .strict();

const cloudinaryEnvironment = cloudinaryEnvironmentSchema.safeParse({
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
});

if (!cloudinaryEnvironment.success) {
  throw new Error("Configuracao do Cloudinary ausente ou invalida.");
}

cloudinary.config({
  cloud_name: cloudinaryEnvironment.data.CLOUDINARY_CLOUD_NAME,
  api_key: cloudinaryEnvironment.data.CLOUDINARY_API_KEY,
  api_secret: cloudinaryEnvironment.data.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
