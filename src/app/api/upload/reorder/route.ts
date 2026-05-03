import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  propertyId: z.string().cuid(),
  orderedIds: z.array(z.string().cuid()),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const { propertyId, orderedIds } = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) {
    return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
  }

  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.propertyPhoto.update({ where: { id }, data: { position } })
    )
  );

  return NextResponse.json({ success: true });
}
