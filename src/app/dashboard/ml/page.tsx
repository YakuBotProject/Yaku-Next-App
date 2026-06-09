// src/app/dashboard/ml/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Box, Container, Text } from '@radix-ui/themes';
import Sidebar from '@/components/layout/Sidebar';
import MLClient from '@/components/ml/MLClient';
import { getMLDashboardData } from '@/services/ml';

export const dynamic = 'force-dynamic';

export default async function MLPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  const cultivosBase = await prisma.cultivos.findMany({ 
    where: { id_usuario: userId, estado: 'activo' }, 
    select: { id: true } 
  });
  
  if (cultivosBase.length === 0) return <Text color="gray">No tienes cultivos activos.</Text>;

  const resolvedParams = await searchParams;
  const selectedCultivoId = resolvedParams.cultivo ? parseInt(resolvedParams.cultivo, 10) : cultivosBase[0].id;

  const mlData = await getMLDashboardData(userId, selectedCultivoId);
  const initials = (session.user.name || "JR").substring(0, 2).toUpperCase();

  return (
    <>
      <Sidebar initials={initials} />
      <Box className="page-content" style={{ background: '#020817', minHeight: '100vh', padding: '2rem 0' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .page-content { padding-bottom: 90px !important; width: 100%; }
          @media (min-width: 768px) { .page-content { padding-bottom: 2rem !important; padding-left: 120px !important; } }
        `}} />
        <Container size="4" px="4">
           <MLClient data={mlData} />
        </Container>
      </Box>
    </>
  );
}