// src/app/auth/register/page.tsx

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import RegisterForm from '@/components/auth/RegisterForm'
import { Box, Text, Container } from '@radix-ui/themes'

export const metadata = {
  title: 'Crear Cuenta - Yaku',
  description: 'Crea tu cuenta en Yaku y comienza a monitorear tus cultivos'
}

export default async function RegisterPage() {
  const session = await getServerSession()
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020817',
    }}>
      <Container size="1">
        <Box style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 1rem',
            background: 'white',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            🌊
          </div>
          <h1 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: 'bold' }}>
            Yaku
          </h1>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Sistema de riego inteligente · Lima, Perú
          </Text>
        </Box>

        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <RegisterForm />
        </Box>

        <Box style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ¿Problemas al registrarte? → soporte@yaku.pe
          </Text>
        </Box>
      </Container>
    </div>
  )
}
