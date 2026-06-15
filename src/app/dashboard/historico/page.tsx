// src/app/dashboard/historico/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Box, Text } from '@radix-ui/themes';
import HistoricoMultiChart from '@/components/historico/HistoricoMultiChart';
import { getHistoricoData } from '@/services/historico';
import { fetchFromFastAPI } from '@/lib/bff';

export const metadata = {
  title: 'Análisis Histórico - Yaku',
  description: 'Visualización de telemetría a largo plazo',
};

export const dynamic = 'force-dynamic';

export default async function HistoricoPage({
  searchParams
}: {
  searchParams: Promise<{ cultivo?: string, rango?: string }>
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

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

  if (cultivosBase.length === 0) {
    return <Text color="gray">No tienes cultivos registrados.</Text>;
  }

  const resolvedSearchParams = await searchParams;
  const selectedCultivoId = resolvedSearchParams.cultivo ? parseInt(resolvedSearchParams.cultivo, 10) : cultivosBase[0].id;
  const rangoDias = resolvedSearchParams.rango ? parseInt(resolvedSearchParams.rango, 10) : 30;

  const historicoData = await getHistoricoData(userId, selectedCultivoId, rangoDias);

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        <HistoricoMultiChart
          cultivos={cultivosBase}
          initialData={historicoData}
          initialCultivo={selectedCultivoId.toString()}
          initialRango={rangoDias}
        />
      </Box>
    </Box>
  );
}