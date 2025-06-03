
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/', // Protect the main chat page
  '/settings(.*)', // Protect settings
  // Onboarding is handled after sign-up, so it should be accessible by authenticated users
  // who haven't completed app-specific onboarding yet.
  // If onboarding must be public before any sign-up step, adjust this.
  '/onboarding(.*)', 
]);

// Define public routes (accessible without authentication)
// Sign-in, sign-up, and any API routes for Clerk webhooks should be public.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook/clerk(.*)', // Example if you add Clerk webhooks
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    return; // Allow access to public routes
  }
  if (isProtectedRoute(req)) {
    auth().protect(); // Protect these routes
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|static|favicon.ico|.*\\..*).*)',
    // Match all routes including the root
    '/',
    // Match API routes if you have them, adjust as needed
    '/(api|trpc)(.*)',
  ],
};
