import { proxy } from '../proxy';

export default proxy;

export const config = {
    matcher: [
        '/((?!socket.io|_next/static|_next/image|favicon.ico).*)',
        '/api/:path*'
    ],
};
