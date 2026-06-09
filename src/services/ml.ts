// src/services/ml.ts
import prisma from "@/lib/prisma";

export async function getMLDashboardData(userId: number, idCultivo: number) {
  // 1. Obtener el modelo activo y el algoritmo
  const usuarioModelo = await prisma.usuario_modelo.findUnique({
    where: { id_usuario: userId },
    include: { modelo: true }
  });

  const modeloActivo = usuarioModelo?.modelo;

  // 2. Obtener las asignaciones del cultivo para buscar la telemetría
  const asignaciones = await prisma.asignaciones_iot.findMany({
    where: { id_usuario: userId, id_cultivo: idCultivo }
  });
  const idsAsig = asignaciones.map(a => a.id);

  // 3. Extraer el historial real (últimos 15 registros para la curva)
  // Nota: En un entorno real de producción se recomienda una vista (View) o un Join temporal
  const humSuelo = await prisma.humedad_suelo.findMany({ where: { id_asignacion: { in: idsAsig } }, orderBy: { fecha: 'desc' }, take: 15 });
  const humAmb = await prisma.humedad_ambiente.findMany({ where: { id_asignacion: { in: idsAsig } }, orderBy: { fecha: 'desc' }, take: 15 });
  const tempSuelo = await prisma.temperatura_suelo.findMany({ where: { id_asignacion: { in: idsAsig } }, orderBy: { fecha: 'desc' }, take: 15 });
  const tempAmb = await prisma.temperatura_ambiente.findMany({ where: { id_asignacion: { in: idsAsig } }, orderBy: { fecha: 'desc' }, take: 15 });

  // Unificamos los 4 parámetros en una sola línea de tiempo
  const datosHistoricos = humSuelo.reverse().map((hs, index) => {
    // Obtenemos su equivalente en tiempo o un valor por defecto si el sensor falló
    const ha = humAmb[humAmb.length - 1 - index];
    const ts = tempSuelo[tempSuelo.length - 1 - index];
    const ta = tempAmb[tempAmb.length - 1 - index];

    return {
      hora: hs.fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      humSuelo: Number(hs.porcentaje || hs.valor || 0),
      humAmb: Number(ha?.porcentaje || ha?.valor || 0),
      tempSuelo: Number(ts?.temperatura || ts?.valor || 0),
      tempAmb: Number(ta?.temperatura || ta?.valor || 0),
    };
  });

  // 4. Obtener umbral mínimo para dibujar la línea roja de peligro
  const umbrales = await prisma.umbrales_config.findMany({
    where: { id_usuario: userId, id_cultivo: idCultivo },
    include: { tipo_metrica: true }
  });
  const umbralMinimo = umbrales.find(u => u.tipo_metrica?.nombre.toLowerCase().includes('suelo'))?.valor_minimo || 40;

  return {
    modelo: {
      nombre: modeloActivo?.nombre_modelo || 'Sin modelo',
      algoritmo: modeloActivo?.algoritmo || 'Algoritmo no definido',
      version: modeloActivo?.version || '1.0.0',
      mae: modeloActivo?.precision_modelo ? Number(modeloActivo.precision_modelo) : 0,
      activo: !!usuarioModelo?.activo
    },
    historial: datosHistoricos,
    umbral: Number(umbralMinimo)
  };
}