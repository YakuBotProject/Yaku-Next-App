// src/app/auth/login/page.tsx

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { Box, Text, Container } from '@radix-ui/themes'

export const metadata = {
  title: 'Inicio de Sesión - Yaku',
  description: 'Inicia sesión en tu cuenta de Yaku'
}

export default async function LoginPage() {
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
          <LoginForm />
        </Box>

        <Box style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ¿Problemas para acceder? → soporte@yaku.pe
          </Text>
        </Box>
      </Container>
    </div>
  )
}
