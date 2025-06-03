
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authResult = getAuth(request);
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    let usersResponse;
    // If query is null, empty, or very short, fetch all users (or a default list)
    // Clerk's `getUserList` without a query should return all users, respecting limits.
    if (!query || query.trim().length < 1) { // Adjusted to allow fetching all if query is empty
      usersResponse = await clerkClient.users.getUserList({ limit: 50 }); // Fetch up to 50 users as a general list
    } else {
      usersResponse = await clerkClient.users.getUserList({
        query: query,
        limit: 10, // Keep limit lower for specific searches
      });
    }
    
    if (!Array.isArray(usersResponse)) {
      console.error('Clerk getUserList did not return an array. Response:', usersResponse);
      let clerkErrorMessage = 'Received unexpected data from user service.';
      // @ts-ignore
      if (usersResponse && usersResponse.errors && Array.isArray(usersResponse.errors) && usersResponse.errors.length > 0) {
        // @ts-ignore
        clerkErrorMessage = usersResponse.errors.map(e => e.message).join(', ');
      }
      // Instead of throwing, return a structured error to the client
      return NextResponse.json({ error: `User service did not return a list: ${clerkErrorMessage}`, users: [] }, { status: 500 });
    }

    const simplifiedUsers = usersResponse
      .map(user => ({
        id: user.id,
        username: user.username,
        primaryEmailAddress: user.primaryEmailAddress?.emailAddress,
        imageUrl: user.imageUrl,
      }))
      .filter(user => user.id !== currentUserId); 

    return NextResponse.json({ users: simplifiedUsers });
  } catch (error) {
    console.error('User search API error:', error);
    let errorMessage = 'Failed to search users due to an unknown error';
    if (error instanceof Error) {
        errorMessage = `Failed to search users: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage, users: [] }, { status: 500 });
  }
}
