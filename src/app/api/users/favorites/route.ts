// src/app/api/users/favorites/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma'; // Now PrismaClient | null
import { z } from 'zod';

const favoritePostSchema = z.object({
  indicatorId: z.string().min(1, "Indicator ID cannot be empty"),
});

// GET: Fetch user's favorite indicator IDs
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // --- PRISMA CHECK ---
  if (!prisma) {
    console.warn("[API GET /users/favorites] No Database Mode: Returning demo favorites or empty.");
    const demoFavorites = (session.user as any).favoriteIndicatorIds || [];
    return NextResponse.json(demoFavorites, { status: 200 });
  }
  // --- END PRISMA CHECK ---

  try {
    const favorites = await prisma.favoriteIndicator.findMany({
      where: { userId: userId },
      select: { indicatorId: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(favorites.map(fav => fav.indicatorId), { status: 200 });
  } catch (error: any) {
    console.error("[API GET /users/favorites] DB Error:", error.message);
    return NextResponse.json({ error: 'Failed to fetch favorites.'}, { status: 500 });
  }
}

// POST: Add an indicator to favorites
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // --- PRISMA CHECK ---
  if (!prisma) {
    console.warn("[API POST /users/favorites] No Database Mode: Cannot add favorite.");
    return NextResponse.json({ error: 'Favorites unavailable in demo mode.' }, { status: 403 });
  }
  // --- END PRISMA CHECK ---

  try {
    const body = await request.json();
    const validation = favoritePostSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    const { indicatorId } = validation.data;

    const existing = await prisma.favoriteIndicator.findUnique({ where: { userId_indicatorId: { userId, indicatorId } } });
    if (existing) return NextResponse.json(existing, { status: 200 });

    const newFavorite = await prisma.favoriteIndicator.create({ data: { userId, indicatorId } });
    return NextResponse.json(newFavorite, { status: 201 });
  } catch (error: any) {
    console.error("[API POST /users/favorites] Error:", error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Already favorited.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE: Remove an indicator from favorites
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  // --- PRISMA CHECK ---
  if (!prisma) {
    console.warn("[API DELETE /users/favorites] No Database Mode: Cannot remove favorite.");
    return NextResponse.json({ error: 'Favorites unavailable in demo mode.' }, { status: 403 });
  }
  // --- END PRISMA CHECK ---

  const { searchParams } = new URL(request.url);
  const indicatorId = searchParams.get('indicatorId');
  if (!indicatorId) return NextResponse.json({ error: 'indicatorId required' }, { status: 400 });

  try {
    await prisma.favoriteIndicator.delete({ where: { userId_indicatorId: { userId, indicatorId } } });
    return NextResponse.json({ message: 'Favorite removed' }, { status: 200 });
  } catch (error: any) {
    console.error("[API DELETE /users/favorites] Error:", error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Favorite not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}