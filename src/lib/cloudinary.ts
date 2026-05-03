import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const hasCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

async function uploadViaCloudinary(
  file: Buffer,
  propertyId: string
): Promise<{ publicId: string; url: string; width: number; height: number }> {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await new Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `pms/properties/${propertyId}`,
          format: "webp",
          quality: "auto:good",
          fetch_format: "auto",
          transformation: [{ width: 1600, height: 1200, crop: "limit" }],
        },
        (error, res) => {
          if (error || !res) reject(error);
          else resolve(res);
        }
      )
      .end(file);
  });

  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
  };
}

async function uploadLocal(
  file: Buffer,
  propertyId: string,
  originalName: string
): Promise<{ publicId: string; url: string; width: number; height: number }> {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const filename = `${crypto.randomBytes(12).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "properties", propertyId);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), file);

  const url = `/uploads/properties/${propertyId}/${filename}`;
  return { publicId: url, url, width: 0, height: 0 };
}

export async function uploadPropertyPhoto(
  file: Buffer,
  propertyId: string,
  originalName = "photo.jpg"
): Promise<{ publicId: string; url: string; width: number; height: number }> {
  if (hasCloudinary) {
    return uploadViaCloudinary(file, propertyId);
  }
  return uploadLocal(file, propertyId, originalName);
}

export async function deletePropertyPhoto(publicId: string): Promise<void> {
  if (hasCloudinary) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    await cloudinary.uploader.destroy(publicId);
    return;
  }
  // Local: publicId is the URL path e.g. /uploads/...
  if (publicId.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", publicId);
    await fs.unlink(filePath).catch(() => undefined);
  }
}
