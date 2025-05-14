// src/app/api/users/favorites/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ensure this path is correct
import prisma from '@/lib/prisma'; // Ensure this path is correct and DB is connected
import { z } from 'zod';

// Zod schema for POST input validation
const favoritePostSchema = z.object({
  indicatorId: z.string().min(1, "Indicator ID cannot be empty"),
});

const IS_DATABASE_MODE_ACTIVE_FOR_FAVORITES = !!process.env.DATABASE_URL; // Check for DB mode

// GET: Fetch user's favorite indicator IDs
export async function GET(request: Request) {
  console.log("[API GET /users/favorites] Request received.");

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    console.warn("[API GET /users/favorites] Unauthorized: No session or user.");
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
  }
  
  const userId = (session.user as any).id;
  if (!userId) {
    console.warn("[API GET /users/favorites] Unauthorized: User ID missing in session.", session.user);
    return NextResponse.json({ error: 'Invalid session: User ID missing.' }, { status: 401 });
  }
  console.log(`[API GET /users/favorites] Authorized for user ID: ${userId}`);

  if (!IS_DATABASE_MODE_ACTIVE_FOR_FAVORITES) {
    console.warn("[API GET /users/favorites] NO DATABASE MODE: Returning empty favorites. Favorites require a database connection.");
    // For NO DB mode, you might return demo favorites if they are in the session
    const demoFavorites = (session.user as any).favoriteIndicatorIds || [];
    console.log("[API GET /users/favorites] NO DATABASE MODE: Returning demo favorites from session:", demoFavorites);
    return NextResponse.json(demoFavorites, { status: 200 });
  }

  try {
    console.log("[API GET /users/favorites] DB MODE: Attempting to fetch favorites from DB...");
    const favorites = await prisma.favoriteIndicator.findMany({
      where: { userId: userId },
      select: { indicatorId: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[API GET /users/favorites] DB MODE: Fetched ${favorites.length} favorites from DB.`);

    const favoriteIds = favorites.map(fav => fav.indicatorId);
    return NextResponse.json(favoriteIds, { status: 200 });

  } catch (error: any) {
    console.error("[API GET /users/favorites] DB MODE: Error fetching favorites from DB:", error.message, error.stack);
    // Log more details if it's a Prisma known error
    if (error.code) { // Prisma errors often have a code
        console.error(`[API GET /users/favorites] Prisma Error Code: ${error.code}`);
    }
    return NextResponse.json({ error: 'Failed to fetch favorites due to a server error.', details: error.message }, { status: 500 });
  }
}

// POST: Add an indicator to favorites
export async function POST(request: Request) {
  console.log("[API POST /users/favorites] Request received.");
  const session = await getServerSession(authOptions);
  if (!session?.user) { /* ... Unauthorized ... */ return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });}
  const userId = (session.user as any).id;
  if (!userId) { /* ... Invalid session ... */ return NextResponse.json({ error: 'Invalid session' }, { status: 401 });}

  if (!IS_DATABASE_MODE_ACTIVE_FOR_FAVORITES) {
    console.warn("[API POST /users/favorites] NO DATABASE MODE: Cannot add favorite.");
    return NextResponse.json({ error: 'Cannot add favorite in no database mode.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = favoritePostSchema.safeParse(body);
    if (!validation.success) { /* ... Invalid input ... */ return NextResponse.json({ error: 'Invalid input' }, { status: 400 });}
    const { indicatorId } = validation.data;

    console.log(`[API POST /users/favorites] User ${userId} adding favorite: ${indicatorId}`);
    const newFavorite = await prisma.favoriteIndicator.create({
      data: { userId, indicatorId },
    });
    return NextResponse.json(newFavorite, { status: 201 });
  } catch (error: any) { /* ... Error handling (check for P2002 unique constraint) ... */ 
    console.error("[API POST /users/favorites] Error:", error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE: Remove an indicator from favorites
export async function DELETE(request: Request) {
  console.log("[API DELETE /users/favorites] Request received.");
  const session = await getServerSession(authOptions);
  if (!session?.user) { /* ... Unauthorized ... */ return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });}
  const userId = (session.user as any).id;
  if (!userId) { /* ... Invalid session ... */ return NextResponse.json({ error: 'Invalid session' }, { status: 401 });}

  if (!IS_DATABASE_MODE_ACTIVE_FOR_FAVORITES) {
    console.warn("[API DELETE /users/favorites] NO DATABASE MODE: Cannot remove favorite.");
    return NextResponse.json({ error: 'Cannot remove favorite in no database mode.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const indicatorId = searchParams.get('indicatorId');
  if (!indicatorId) { /* ... Missing indicatorId ... */ return NextResponse.json({ error: 'indicatorId required' }, { status: 400 });}

  try {
    console.log(`[API DELETE /users/favorites] User ${userId} removing favorite: ${indicatorId}`);
    await prisma.favoriteIndicator.delete({
      where: { userId_indicatorId: { userId, indicatorId } },
    });
    return NextResponse.json({ message: 'Favorite removed' }, { status: 200 });
  } catch (error: any) { /* ... Error handling (check for P2025 not found) ... */ 
    console.error("[API DELETE /users/favorites] Error:", error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}