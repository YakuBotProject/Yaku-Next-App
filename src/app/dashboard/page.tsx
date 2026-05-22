// src/app/dashboard/page.tsx

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Box, Text, Container, Button } from '@radix-ui/themes'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard - Yaku',
  description: 'Panel de control de Yaku'
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <Container size="2">
      <Box py="6">
        <Text as="h1" size="8" weight="bold">
          Bienvenido, {session.user?.name}
        </Text>
        <Text size="3" color="gray" mt="2">
          {session.user?.email}
        </Text>

        <Box mt="6">
          <Text as="p" size="4">
            Este es tu panel de control. Aquí podrás monitorear tus cultivos y sistemas de riego.
          </Text>
        </Box>

        <Box mt="6">
          <Link href="/api/auth/signout">
            <Button color="red">
              Cerrar sesión
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  )
}
