// middleware.ts

import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Routes that can be accessed without authentication
  publicRoutes: ['/', '/sign-in', '/sign-up', '/api/genkit'],
  // Routes that Clerk should skip entirely (e.g. analytics, etc.)
  ignoredRoutes: [],
});

export const config = {
  // Matcher tells Next.js which routes to apply middleware to
  matcher: [
    '/((?!.+\\.[\\w]+$|_next|favicon.ico).*)', // Protect all non-static routes
    '/', 
    '/(api|trpc)(.*)',
  ],
};

