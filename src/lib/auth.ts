import { NextAuthOptions, Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from './prisma'
import { verify } from 'argon2'
import { JWT } from 'next-auth/jwt'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        correo: { label: 'Correo', type: 'email' },
        contrasena: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.contrasena) {
          throw new Error('Correo y contraseña requeridos')
        }

        const usuario = await prisma.usuarios.findUnique({
          where: { correo: credentials.correo },
          include: { roles: true }
        })

        if (!usuario) {
          throw new Error('Usuario no encontrado')
        }

        if (!usuario.estado) {
          throw new Error('Usuario inactivo')
        }

        const esValido = await verify(usuario.contrasena, credentials.contrasena)
        
        if (!esValido) {
          throw new Error('Contraseña incorrecta')
        }

        // Log de inicio de sesión
        await prisma.logs_sistema.create({
          data: {
            id_usuario: usuario.id_usuario,
            accion: 'login',
            descripcion: `Inicio de sesión: ${usuario.nombre}`
          }
        }).catch((err: any) => console.error('Error al registrar log:', err))

        return {
          id: usuario.id_usuario.toString(),
          name: usuario.nombre,
          email: usuario.correo
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login'
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET
}