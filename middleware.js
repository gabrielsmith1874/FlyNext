
import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

// List of paths that require authentication
const protectedPaths = [
  '/api/auth/profile',
  '/api/bookings',
  '/api/hotels/bookings',
  '/api/notifications'
];

// List of paths that require specific roles
const roleProtectedPaths = {
  '/api/hotels': ['HOTEL_OWNER', 'ADMIN']
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const roleProtectedPath = Object.keys(roleProtectedPaths).find(path => pathname.startsWith(path));

  if (isProtectedPath || roleProtectedPath) {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const decoded = verifyToken(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Check role if required
      if (roleProtectedPath) {
        const allowedRoles = roleProtectedPaths[roleProtectedPath];

        if (!allowedRoles.includes(decoded.role)) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }

      // Modify request headers to pass user data
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.id);
      requestHeaders.set('x-user-email', decoded.email);
      requestHeaders.set('x-user-role', decoded.role);

      // Continue with modified request
      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });

    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  }

  // Continue with unmodified request for non-protected paths
  return NextResponse.next();
}

// Apply middleware only to API routes
export const config = {
  matcher: ['/api/:path*']
};