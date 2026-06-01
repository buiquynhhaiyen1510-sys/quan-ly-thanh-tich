import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (pathname.startsWith('/teacher') && role !== 'TEACHER' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (pathname === '/login' && role) {
    const dest = role === 'ADMIN' ? '/admin' : '/teacher'
    return NextResponse.redirect(new URL(dest, req.url))
  }
})

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/login'],
}
