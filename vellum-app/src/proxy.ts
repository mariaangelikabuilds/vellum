import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher([
  '/app(.*)',
  '/api/documents(.*)',
  '/api/detect-claims(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return;
  // Bare protect() answers a signed-out page request with a 404, which reads as
  // a broken link. Pages send the visitor to sign-in; API routes keep the 404
  // so an unauthenticated fetch does not receive an HTML redirect.
  const isApi = req.nextUrl.pathname.startsWith('/api');
  await auth.protect(
    isApi ? undefined : { unauthenticatedUrl: new URL('/sign-in', req.url).toString() },
  );
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
