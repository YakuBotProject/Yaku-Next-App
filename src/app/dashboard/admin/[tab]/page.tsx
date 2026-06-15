// src/app/dashboard/admin/[tab]/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Box, Container } from '@radix-ui/themes';
import AdminClient from '@/components/admin/AdminClient';
import {
  listarUsuarios,
  listarDispositivos,
  listarTiposDispositivo,
  listarTiposComponente,
  listarComponentes,
  listarPlantas,
  listarTiposMetrica
} from '@/actions/admin';
import {
  listarRegiones,
  listarTodasProvincias,
  listarTodosDistritos,
  listarTodosCultivos,
  listarFuentesAgua
} from '@/actions/crops';
import { listarAlmacenes } from '@/actions/almacenes';

export const metadata = {
  title: 'Consola de Administrador - Yaku',
  description: 'Gestión técnica y de usuarios de la red IoT Yaku',
};

export const dynamic = 'force-dynamic';

const VALID_TABS = ['usuarios', 'dispositivos', 'catalogo', 'respaldo', 'almacenes'];

interface PageProps {
  params: Promise<{ tab: string }>;
}

export default async function AdminDashboardTabPage({ params }: PageProps) {
  const { tab } = await params;

  if (!VALID_TABS.includes(tab)) {
    notFound();
  }

  const session = await getServerSession(authOptions);

  // 1. Proteger ruta a nivel de servidor (Redundancia segura al Middleware)
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const userRol = (session.user as any).rol;
  if (userRol !== 'administrador') {
    redirect('/dashboard');
  }

  // 2. Cargar datos desde FastAPI mediante BFF Server Actions en paralelo
  const [
    users,
    devices,
    crops,
    tiposDispositivo,
    tiposComponente,
    catalogPlantas,
    regionesList,
    provinciasList,
    distritosList,
    almacenesList,
    componentsList,
    fuentesAguaList,
    metricasList
  ] = await Promise.all([
    listarUsuarios().catch(() => []),
    listarDispositivos().catch(() => []),
    listarTodosCultivos().catch(() => []),
    listarTiposDispositivo().catch(() => []),
    listarTiposComponente().catch(() => []),
    listarPlantas().catch(() => []),
    listarRegiones().catch(() => []),
    listarTodasProvincias().catch(() => []),
    listarTodosDistritos().catch(() => []),
    listarAlmacenes().catch(() => []),
    listarComponentes().catch(() => []),
    listarFuentesAgua().catch(() => []),
    listarTiposMetrica().catch(() => [])
  ]);

  return (
    <Box className="page-content" style={{ padding: '2rem 0' }}>
      <Box style={{ width: '100%', maxWidth: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
        <AdminClient 
          initialUsers={users} 
          initialDevices={devices} 
          initialCrops={crops} 
          tiposDispositivo={tiposDispositivo}
          tiposComponente={tiposComponente}
          catalogPlantas={catalogPlantas}
          regiones={regionesList}
          provincias={provinciasList}
          distritos={distritosList}
          initialAlmacenes={almacenesList}
          initialComponents={componentsList}
          fuentesAgua={fuentesAguaList}
          metricas={metricasList}
          activeTab={tab}
        />
      </Box>
    </Box>
  );
}
