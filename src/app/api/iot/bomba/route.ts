// src/app/api/iot/bomba/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { idTelemetria, estado } = body;

    if (!idTelemetria) {
      return NextResponse.json({ error: "Falta el ID de telemetría" }, { status: 400 });
    }

    // 1. Actualizamos telemetria_tanque y pedimos su asignación para conocer el cultivo
    const updateTelemetria = await prisma.telemetria_tanque.update({
      where: { id: BigInt(idTelemetria) },
      data: { bomba_encendida: estado },
      include: { asignacion: true }
    });

    // 2. SINCRONIZACIÓN: Buscamos la bomba física de este cultivo y la actualizamos
    if (updateTelemetria.asignacion?.id_cultivo) {
      const bombaAsignacion = await prisma.asignaciones_iot.findFirst({
        where: {
          id_cultivo: updateTelemetria.asignacion.id_cultivo,
          configuracion_tanque: { isNot: null }
        }
      });

      if (bombaAsignacion) {
        await prisma.configuracion_tanque.update({
          where: { id_asignacion: bombaAsignacion.id },
          data: {
            bomba_encendida: estado,
            actualizado_en: new Date()
          }
        });
      }
    }

    // 3. Auditoría en logs_sistema
    await prisma.logs_sistema.create({
      data: {
        id_usuario: parseInt((session.user as any).id, 10),
        accion: estado ? "Encendido manual de bomba" : "Apagado manual de bomba",
        modulo: "Dashboard Principal",
        descripcion: `Actualización de bomba desde widget de Tanque (Telemetría ID: ${idTelemetria})`,
      },
    });

    const responseData = {
      ...updateTelemetria,
      id: updateTelemetria.id.toString(),
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error al actualizar la bomba en telemetría:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}