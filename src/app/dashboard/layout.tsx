import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { Box } from '@radix-ui/themes';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  const name = session?.user?.name || "JR";
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Box style={{ minHeight: '100vh', background: '#020817' }}>
      
      <Sidebar initials={initials} />
      
      <Box className="main-content">
        {children}
      </Box>

      {/* SOLUCIÓN: Usamos una etiqueta style nativa para Server Components */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .main-content {
            padding-bottom: 70px; /* Margen para el navbar en celulares */
            width: 100%;
          }

          @media (min-width: 768px) {
            .main-content {
              padding-bottom: 0;
              padding-left: 80px; /* Margen exacto del ancho del sidebar en PC */
            }
          }
        `
      }} />
    </Box>
  );
}