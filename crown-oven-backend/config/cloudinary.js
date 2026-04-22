import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const dishStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/dishes",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const proofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/payment-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 200, height: 200, crop: "fill" }],
  },
});

const roomStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "crown-oven/rooms",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 500, crop: "limit" }],
  },
});

export const uploadDishImage = multer({ storage: dishStorage });
export const uploadProofImage = multer({ storage: proofStorage });
export const uploadAvatar = multer({ storage: avatarStorage });
export const uploadRoomImage = multer({ storage: roomStorage });
export default cloudinary;
