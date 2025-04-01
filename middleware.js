import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

// List of paths that require authentication
const protectedPaths = [
  '/profile',
  '/bookings',
  '/checkout',
  '/api/bookings',
  '/api/checkout',
  '/api/hotels/bookings',
  '/api/notifications',
  '/api/auth/profile',
];

// List of paths that require specific roles
const roleProtectedPaths = {
  '/hotels/create': ['HOTEL_OWNER', 'ADMIN'],
  '/api/hotels/create': ['HOTEL_OWNER', 'ADMIN'],
  // Remove any role protection for /api/hotels endpoints
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log(`Middleware processing: ${pathname}`);

  // Skip middleware for myhotels page and any related API requests
  if (pathname.startsWith('/hotels/myhotels') || 
      (pathname.startsWith('/api/hotels') && 
       !pathname.startsWith('/api/hotels/create'))) {
    console.log('Skipping middleware for myhotels related path:', pathname);
    return NextResponse.next();
  }

  // Special case for hotel room availability - allow all authenticated users
  if (pathname.match(/\/api\/hotels\/[^\/]+\/rooms/)) {
    console.log('Hotel rooms endpoint detected - checking authentication only');
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header found');
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
        console.log('Invalid token');
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Set user info in headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.id);
      requestHeaders.set('x-user-email', decoded.email);
      requestHeaders.set('x-user-role', decoded.role);

      // Forward the request with user headers
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

  // Check if path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const roleProtectedPath = Object.keys(roleProtectedPaths).find(path => pathname.startsWith(path));

  if (isProtectedPath) {
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

  // Check if path requires specific role
  for (const [path, roles] of Object.entries(roleProtectedPaths)) {
    if (pathname.startsWith(path) && path !== '/hotels/owner') {
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

        // Check role
        if (!roles.includes(decoded.role)) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
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
  }

  // Continue with unmodified request for non-protected paths
  return NextResponse.next();
}

// Apply middleware only to API routes, and update to include myhotels path
export const config = {
  matcher: [
    '/profile/:path*',
    '/bookings/:path*',
    '/checkout/:path*', 
    '/api/:path*',
    '/hotels/create/:path*'
  ],
};