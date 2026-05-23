// src/app/api/sensores/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * GET /api/sensores
 * Obtiene lista de todos los sensores disponibles con su información
 *
 * Query params:
 * - id_dispositivo: filtrar por dispositivo
 * - estado: filtrar por estado (activo, inactivo)
 */
export async function GET(request: NextRequest) {
  try {
    //VALIDAR JWT

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Token requerido",
        },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const { valid, decoded } = verifyToken(token);

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Token inválido",
        },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id_dispositivo = searchParams.get("id_dispositivo");
    const estado = searchParams.get("estado");

    const where: any = {};
    if (id_dispositivo) where.id_dispositivo = parseInt(id_dispositivo);
    if (estado) where.estado = estado;

    const sensores = await prisma.sensores.findMany({
      where,
      include: {
        dispositivos: true,
        lecturas_sensor: {
          orderBy: { fecha_hora: "desc" },
          take: 1, // Última lectura
        },
      },
      orderBy: { id_sensor: "asc" },
    });

    return NextResponse.json(
      {
        success: true,
        count: sensores.length,
        data: sensores,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al obtener sensores:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sensores/[id_sensor]/estadisticas
 * Obtiene estadísticas de un sensor específico
 */
export async function getEstadisticas(
  id_sensor: number,
  periodo_horas: number = 24,
) {
  try {
    const fecha_inicio = new Date(Date.now() - periodo_horas * 60 * 60 * 1000);

    const lecturas = await prisma.lecturas_sensor.findMany({
      where: {
        id_sensor,
        fecha_hora: {
          gte: fecha_inicio,
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    if (lecturas.length === 0) {
      return {
        count: 0,
        promedio: null,
        minimo: null,
        maximo: null,
        ultima_lectura: null,
      };
    }

    const valores = lecturas.map((l) => parseFloat(l.valor?.toString() || "0"));
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);

    return {
      count: lecturas.length,
      promedio: Math.round(promedio * 100) / 100,
      minimo,
      maximo,
      ultima_lectura: lecturas[lecturas.length - 1],
    };
  } catch (error) {
    throw error;
  }
}
