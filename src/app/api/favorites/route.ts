// src/app/api/users/favorites/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { z } from 'zod'; // For input validation

// Zod schema for input validation
const favoriteSchema = z.object({
  indicatorId: z.string().min(1, "Indicator ID cannot be empty"),
});

// GET: Fetch user's favorite indicator IDs
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const favorites = await prisma.favoriteIndicator.findMany({
      where: { userId: userId },
      select: { indicatorId: true }, // Only select the IDs
    });
    const favoriteIds = favorites.map(fav => fav.indicatorId);
    return NextResponse.json(favoriteIds);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST: Add an indicator to favorites
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validation = favoriteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { indicatorId } = validation.data;

    // Check if already favorited (optional, DB constraint handles it but good for UX)
    const existingFavorite = await prisma.favoriteIndicator.findUnique({
      where: { userId_indicatorId: { userId, indicatorId } },
    });
    if (existingFavorite) {
      return NextResponse.json({ message: 'Already favorited', favorite: existingFavorite }, { status: 200 });
    }

    const newFavorite = await prisma.favoriteIndicator.create({
      data: { userId, indicatorId },
    });
    return NextResponse.json(newFavorite, { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    if ((error as any).code === 'P2002') { // Prisma unique constraint violation
        return NextResponse.json({ error: 'Indicator already favorited (concurrent request).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE: Remove an indicator from favorites
// We'll pass indicatorId in the URL for DELETE, or you can use request body
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const { searchParams } = new URL(request.url);
  const indicatorId = searchParams.get('indicatorId');

  if (!indicatorId) {
      return NextResponse.json({ error: 'indicatorId query parameter is required' }, { status: 400 });
  }

  try {
    await prisma.favoriteIndicator.delete({
      where: { userId_indicatorId: { userId, indicatorId } },
    });
    return NextResponse.json({ message: 'Favorite removed' }, { status: 200 });
  } catch (error) {
    console.error("Error removing favorite:", error);
    // Prisma throws P2025 if record to delete is not found
    if ((error as any).code === 'P2025') {
        return NextResponse.json({ error: 'Favorite not found or already removed' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}