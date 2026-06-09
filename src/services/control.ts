// src/services/control.ts
import prisma from "@/lib/prisma";

export async function getControlData(userId: number, idCultivo: number) {
  // 1. Obtener usuario y su rol
  const usuario = await prisma.usuarios.findUnique({
    where: { id: userId },
    include: { rol: true }
  });
  const esInvestigador = usuario?.rol.nombre.toLowerCase().includes('investigador') || false;

  // 2. Obtener la asignación de la bomba (Actuador)
  const asignaciones = await prisma.asignaciones_iot.findMany({
    where: { id_usuario: userId, id_cultivo: idCultivo },
    include: {
      dispositivo: true,
      configuracion_tanque: true,
      componente: { include: { tipo_componente: true } }
    }
  });

  const bombaAsig = asignaciones.find(a => a.configuracion_tanque !== null);
  const pinGpio = bombaAsig?.pin_gpio || 'N/A';
  const estadoDispositivo = bombaAsig?.dispositivo?.estado || 'offline';
  const bombaEncendida = bombaAsig?.configuracion_tanque?.bomba_encendida || false;
  const idBomba = bombaAsig?.id;

  // 3. Obtener configuración general (Timeout)
  const configControl = await prisma.configuracion_control.findFirst({
    where: { id_usuario: userId, id_cultivo: idCultivo }
  });
  const timeoutMin = configControl ? Math.floor(configControl.duracion_riego_max_seg / 60) : 10;

  // 4. Determinar el Modo de Operación Actual
  const usuarioModelo = await prisma.usuario_modelo.findUnique({ where: { id_usuario: userId } });
  const tieneModelo = !!usuarioModelo;
  const predictivoActivo = usuarioModelo?.activo || false;

  const programaciones = idBomba ? await prisma.programacion_riego.findMany({
    where: { id_usuario: userId, id_asignacion: idBomba },
    orderBy: { hora_inicio: 'asc' }
  }) : [];
  
  const programadoActivo = programaciones.some(p => p.activo);
  const manualActivo = !predictivoActivo && !programadoActivo;

  let modoActual = 'Manual';
  if (predictivoActivo) modoActual = 'Predictivo (ML)';
  if (programadoActivo) modoActual = 'Programado';

  // 5. Historial: Aumentamos a 20 para llenar bien la tabla del modal
  const sysLogs = await prisma.logs_sistema.findMany({
    where: { id_usuario: userId },
    orderBy: { fecha: 'desc' },
    take: 20
  });

  const logsUnificados = sysLogs.map(l => ({
    id: l.id.toString(),
    fecha: l.fecha.toISOString().replace('T', ' ').split('.')[0],
    modulo: l.modulo || 'General',
    accion: l.accion,
    descripcion: l.descripcion || '-',
    ip_acceso: l.ip_acceso || 'N/A'
  }));

  // 6. Mapear programaciones
  const horarios = programaciones.map(p => ({
    id: p.id,
    hora: new Date(p.hora_inicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
    dias: [p.lunes, p.martes, p.miercoles, p.jueves, p.viernes, p.sabado, p.domingo],
    duracionMin: Math.floor(p.duracion_seg / 60),
    activo: p.activo
  }));

  return {
    bomba: { id: idBomba, pin: pinGpio, online: estadoDispositivo === 'activo', encendida: bombaEncendida, timeoutMin },
    seguridad: { esInvestigador },
    modo: { actual: modoActual, manualActivo, predictivoActivo, programadoActivo, tieneModelo },
    logs: logsUnificados,
    horarios
  };
}