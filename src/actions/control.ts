// src/actions/control.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setModoOperacion(userId: number, idCultivo: number, idBomba: number, modo: 'manual' | 'predictivo' | 'programado') {
  if (modo === 'manual' || modo === 'programado') {
    await prisma.usuario_modelo.updateMany({ where: { id_usuario: userId }, data: { activo: false } });
  }
  
  if (modo === 'manual' || modo === 'predictivo') {
    await prisma.programacion_riego.updateMany({ where: { id_usuario: userId, id_asignacion: idBomba }, data: { activo: false } });
  }

  if (modo === 'predictivo') {
    await prisma.usuario_modelo.updateMany({ where: { id_usuario: userId }, data: { activo: true } });
  }

  if (modo === 'programado') {
    await prisma.programacion_riego.updateMany({ where: { id_usuario: userId, id_asignacion: idBomba }, data: { activo: true } });
  }

  revalidatePath('/dashboard/control');
}

export async function toggleHorario(idHorario: number, activo: boolean) {
  await prisma.programacion_riego.update({ where: { id: idHorario }, data: { activo } });
  revalidatePath('/dashboard/control');
}

export async function eliminarHorario(idHorario: number) {
  await prisma.programacion_riego.delete({ where: { id: idHorario } });
  revalidatePath('/dashboard/control');
}

export async function agregarHorario(userId: number, idBomba: number, hora: string, min: number, dias: boolean[]) {
  const [h, m] = hora.split(':');
  const d = new Date(); d.setHours(parseInt(h), parseInt(m), 0, 0);

  await prisma.programacion_riego.create({
    data: {
      id_usuario: userId,
      id_asignacion: idBomba,
      hora_inicio: d,
      duracion_seg: min * 60,
      activo: true,
      lunes: dias[0], martes: dias[1], miercoles: dias[2], jueves: dias[3], viernes: dias[4], sabado: dias[5], domingo: dias[6]
    }
  });
  revalidatePath('/dashboard/control');
}

export async function triggerBombaManual(userId: number, idBomba: number, duracionSeg: number) {
  // Lógica para enviar señal MQTT al ESP32 (omitida por simplicidad)
  // Guardamos un log auditable
  await prisma.logs_sistema.create({
    data: { id_usuario: userId, accion: `Bomba forzada ON ${duracionSeg}s`, modulo: 'Control' }
  });
  revalidatePath('/dashboard/control');
}

export async function toggleBombaManual(userId: number, idBomba: number, encender: boolean) {
  // 1. Actualizamos el actuador físico
  const configTanque = await prisma.configuracion_tanque.update({
    where: { id_asignacion: idBomba },
    data: { 
      bomba_encendida: encender,
      actualizado_en: new Date()
    },
    include: { asignacion: true }
  });

  // 2. SINCRONIZACIÓN: Actualizamos el registro más reciente de telemetría de ese cultivo
  if (configTanque.asignacion?.id_cultivo) {
    const sensorTanque = await prisma.asignaciones_iot.findFirst({
      where: {
        id_cultivo: configTanque.asignacion.id_cultivo,
        telemetria_tanque: { some: {} }
      },
      include: { telemetria_tanque: { orderBy: { fecha: 'desc' }, take: 1 } }
    });

    if (sensorTanque && sensorTanque.telemetria_tanque.length > 0) {
      await prisma.telemetria_tanque.update({
        where: { id: sensorTanque.telemetria_tanque[0].id },
        data: { bomba_encendida: encender }
      });
    }
  }

  // 3. Auditoría
  await prisma.logs_sistema.create({
    data: { 
      id_usuario: userId, 
      accion: encender ? 'Encendido manual de bomba' : 'Apagado manual de bomba', 
      modulo: 'Control y Configuración',
      descripcion: `El usuario forzó el estado del actuador a ${encender ? 'ON' : 'OFF'}.`,
    }
  });

  // Refrescamos ambas rutas para que reaccionen al instante
  revalidatePath('/dashboard/control');
  revalidatePath('/dashboard'); 
}