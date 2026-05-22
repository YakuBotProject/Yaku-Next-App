// src/middleware.ts

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Aquí puedes agregar lógica adicional si es necesaria
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

// Proteger rutas que requieren autenticación
export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
}
