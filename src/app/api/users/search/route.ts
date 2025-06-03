
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

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] }); 
    }

    const usersResponse = await clerkClient.users.getUserList({
      query: query,
      limit: 10, 
    });
    
    if (!Array.isArray(usersResponse)) {
      console.error('Clerk getUserList did not return an array. Response:', usersResponse);
      // Check if usersResponse might be a Clerk error object itself, e.g. usersResponse.errors
      // For now, throw a generic error if it's not an array.
      let clerkErrorMessage = 'Received unexpected data from user service.';
      // @ts-ignore
      if (usersResponse && usersResponse.errors && Array.isArray(usersResponse.errors) && usersResponse.errors.length > 0) {
        // @ts-ignore
        clerkErrorMessage = usersResponse.errors.map(e => e.message).join(', ');
      }
      throw new Error(`User service did not return a list: ${clerkErrorMessage}`);
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
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
