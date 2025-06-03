
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Clerk Edge middleware should protect this route, but double check auth
    const authResult = getAuth(request);
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] }); // Return empty if query too short
    }

    // Search by various fields. `query` is a general search term.
    const usersResponse = await clerkClient.users.getUserList({
      query: query,
      limit: 10, // Limit results to 10
    });
    

    const simplifiedUsers = usersResponse
      .map(user => ({
        id: user.id,
        username: user.username,
        primaryEmailAddress: user.primaryEmailAddress?.emailAddress,
        imageUrl: user.imageUrl,
      }))
      .filter(user => user.id !== currentUserId); // Exclude current user from search results

    return NextResponse.json({ users: simplifiedUsers });
  } catch (error) {
    console.error('User search API error:', error);
    // Check if it's a Clerk specific error and provide more details if safe
    if (error instanceof Error) {
        return NextResponse.json({ error: `Failed to search users: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to search users due to an unknown error' }, { status: 500 });
  }
}
