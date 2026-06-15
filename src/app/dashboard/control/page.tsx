// src/app/dashboard/control/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Box } from '@radix-ui/themes';
import ControlClient from '@/components/control/ControlClient';
import { getControlData } from '@/services/control';
import { fetchFromFastAPI } from '@/lib/bff';

export const dynamic = 'force-dynamic';

export default async function ControlPage({ searchParams }: { searchParams: Promise<{ cultivo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login');

  const userId = parseInt(session.user.id, 10);
  
  // Obtener los cultivos llamando al endpoint de dashboard
  const resDashboard = await fetchFromFastAPI("/dashboard/data");
  if (!resDashboard.ok) {
    return <div style={{ color: 'white', padding: '2rem' }}>Error al conectar con el servidor backend.</div>;
  }
  const dashboardData = await resDashboard.json();
  const cultivosBase = dashboardData.map((c: any) => ({
    id: c.idCultivo,
    nombre_planta: c.nombreCultivo
  }));
  
  if (cultivosBase.length === 0) return <div style={{ color: 'white', padding: '2rem' }}>No tienes cultivos activos.</div>;

  const resolvedParams = await searchParams;
  const selectedCultivoId = resolvedParams.cultivo ? parseInt(resolvedParams.cultivo, 10) : cultivosBase[0].id;

  const controlData = await getControlData(userId, selectedCultivoId);
  
  let modelosML = [];
  try {
    const resModels = await fetchFromFastAPI(`/ml/models?id_cultivo=${selectedCultivoId}`);
    if (resModels.ok) {
      modelosML = await resModels.json();
    }
  } catch (err) {
    console.error("Error fetching ML models:", err);
  }

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
         <ControlClient userId={userId} cultivos={cultivosBase} data={controlData} idCultivo={selectedCultivoId} modelosML={modelosML} />
      </Box>
    </Box>
  );
}