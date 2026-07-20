import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import { Media, MediaType } from "../entities/media";

const assetsDir = path.join(process.cwd(), "assets");
const imageDir = path.join(assetsDir, "img");
const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_SIZE,
    files: 1,
    fields: 10,
    parts: 11,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Le fichier doit être une image"));
      return;
    }

    cb(null, true);
  },
});

function ensureImageDir() {
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
}

function makeFileName(prefix: string) {
  return `${prefix}-${Date.now()}.webp`;
}

export async function saveImage(
  file: Express.Multer.File,
  type: MediaType,
  prefix: string,
  width: number,
  height: number,
  fit: keyof sharp.FitEnum,
) {
  ensureImageDir();

  const fileName = makeFileName(prefix);
  const outputPath = path.join(imageDir, fileName);

  await sharp(file.buffer)
    .resize({
      width,
      height,
      fit,
      withoutEnlargement: true,
    })
    .webp({
      quality: 75,
    })
    .toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  const stats = fs.statSync(outputPath);

  const media = new Media();
  media.originalName = file.originalname;
  media.fileName = fileName;
  media.mimeType = "image/webp";
  media.path = outputPath;
  media.url = `/assets/img/${fileName}`;
  media.type = type;
  media.width = metadata.width || 0;
  media.height = metadata.height || 0;
  media.size = stats.size;

  await media.save();
  return media;
}

export async function deleteMediaFile(media?: Media | null) {
  if (!media) {
    return;
  }

  if (fs.existsSync(media.path)) {
    fs.unlinkSync(media.path);
  }

  await media.remove();
}
