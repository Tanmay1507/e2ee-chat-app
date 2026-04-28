import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy configuration/handler for API communication.
 */
export function proxy(request: NextRequest) {
    const token = request.cookies.get('jwt')?.value;
    const pathname = request.nextUrl.pathname;

    // 1. Handle API Proxying
    if (pathname.startsWith('/api/')) {
        const backendPath = pathname.replace('/api/', '/');
        const backendUrl = new URL(backendPath, process.env.BACKEND_URL || 'http://localhost:4000');
        
        backendUrl.search = request.nextUrl.search;
        console.log(`📡 Proxying API request: ${pathname} -> ${backendUrl.toString()}`);
        
        return NextResponse.rewrite(backendUrl, {
            request: {
                headers: new Headers(request.headers),
            },
        });
    }

    // 2. Handle Socket.io Proxying
    if (pathname.startsWith('/socket.io/')) {
        const backendUrl = new URL(pathname, process.env.BACKEND_URL || 'http://localhost:4000');
        backendUrl.search = request.nextUrl.search;
        console.log(`🔌 Proxying Socket.io request: ${pathname}`);
        
        return NextResponse.rewrite(backendUrl, {
            request: {
                headers: new Headers(request.headers),
            },
        });
    }

    // 3. Handle Frontend Protection
    const isAuthRoute = pathname === '/login' || pathname === '/signup';
    const isProtectedRoute = pathname === '/';

    console.log(`🌐 Route check: ${pathname}, isAuth=${isAuthRoute}, isProtected=${isProtectedRoute}`);

    if (isProtectedRoute && !token) {
        console.log(`🔒 Redirecting to /login (no token)`);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/:path*',
        '/',
        '/login',
        '/signup',
    ],
};
