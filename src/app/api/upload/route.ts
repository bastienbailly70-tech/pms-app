import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPropertyPhoto } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const propertyId = req.nextUrl.searchParams.get("propertyId");
  if (!z.string().cuid().safeParse(propertyId).success) {
    return NextResponse.json({ error: "propertyId invalide." }, { status: 400 });
  }

  // Verify ownership
  const property = await prisma.property.findFirst({
    where: { id: propertyId!, ownerId: session.user.id },
  });
  if (!property) {
    return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { publicId, url, width, height } = await uploadPropertyPhoto(buffer, propertyId!, file.name);

  const photoCount = await prisma.propertyPhoto.count({ where: { propertyId: propertyId! } });

  const photo = await prisma.propertyPhoto.create({
    data: {
      propertyId: propertyId!,
      cloudinaryId: publicId,
      url,
      width,
      height,
      position: photoCount,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
