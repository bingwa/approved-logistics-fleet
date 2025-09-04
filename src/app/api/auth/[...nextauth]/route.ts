// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'text'     },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('[Debug] Received credentials:', credentials)

        /* 1. Validate payload */
        if (!credentials?.email || !credentials?.password) {
          console.log('[Debug] Missing email or password')
          return null
        }

        /* 2. Look up user */
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        console.log('[Debug] DB user:', user)

        if (!user || !user.password) {   // ←  field is `password`
          console.log('[Debug] User not found or has no password hash')
          return null
        }

        /* 3. Verify password */
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password               // ← compare against hashed value
        )
        if (!isValid) {
          console.log('[Debug] Invalid password for', credentials.email)
          return null
        }

        /* 4. Success – return minimal session object */
        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],

  /* Optional session / page settings (adjust as you like) */
  session: { strategy: 'jwt' },
  pages:   { signIn: '/signin' }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
