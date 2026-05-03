import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePropertyPhoto } from "@/lib/cloudinary";
import { z } from "zod";

const schema = z.object({ photoId: z.string().cuid() });

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const photo = await prisma.propertyPhoto.findFirst({
    where: { id: parsed.data.photoId, property: { ownerId: session.user.id } },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  await deletePropertyPhoto(photo.cloudinaryId);
  await prisma.propertyPhoto.delete({ where: { id: photo.id } });

  return NextResponse.json({ success: true });
}
