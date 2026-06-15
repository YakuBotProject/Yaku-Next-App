import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function fetchFromFastAPI(endpoint: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('No autorizado: Sesión de usuario inválida');
  }

  const fastapiUrl = process.env.FASTAPI_API_URL || 'http://127.0.0.1:8000';
  const apiKey = process.env.FASTAPI_API_KEY || 'clave_secreta_yaku_bff';

  const headers = new Headers(options.headers);
  headers.set('X-API-Key', apiKey);
  headers.set('X-User-Id', session.user.id);

  // Asegurar que el endpoint comience con /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return fetch(`${fastapiUrl}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });
}
