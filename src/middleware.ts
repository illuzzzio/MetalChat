
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/', 
  '/settings(.*)', 
  '/onboarding(.*)', 
  '/api/users/search(.*)', // Protect the new API route
]);

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook/clerk(.*)', 
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    return; 
  }
  if (isProtectedRoute(req)) {
    auth().protect(); 
  }
});

export const config = {
  matcher: [
    '/((?!_next|static|favicon.ico|.*\\..*).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
