// src/app/dashboard/ml/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Box, Text } from '@radix-ui/themes';
import MLClient from '@/components/ml/MLClient';
import { getMLDashboardData } from '@/services/ml';
import { fetchFromFastAPI } from '@/lib/bff';

export const dynamic = 'force-dynamic';

export default async function MLPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  
  // Obtener los cultivos llamando al endpoint de dashboard
  const resDashboard = await fetchFromFastAPI("/dashboard/data");
  if (!resDashboard.ok) {
    return <Text color="red" style={{ padding: '2rem' }}>Error al conectar con el servidor backend.</Text>;
  }
  const dashboardData = await resDashboard.json();
  const cultivosBase = dashboardData.map((c: any) => ({
    id: c.idCultivo,
    nombre_planta: c.nombreCultivo
  }));
  
  if (cultivosBase.length === 0) return <Text color="gray">No tienes cultivos activos.</Text>;

  const resolvedParams = await searchParams;
  const selectedCultivoId = resolvedParams.cultivo ? parseInt(resolvedParams.cultivo, 10) : cultivosBase[0].id;

  const mlData = await getMLDashboardData(userId, selectedCultivoId);
  const isAdmin = (session.user as any).rol === 'administrador';

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <MLClient data={mlData} cultivos={cultivosBase} idCultivo={selectedCultivoId} isAdmin={isAdmin} />
      </Box>
    </Box>
  );
}