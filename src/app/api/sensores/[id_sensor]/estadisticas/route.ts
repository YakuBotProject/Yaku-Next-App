// src/app/api/sensores/[id_sensor]/estadisticas/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * GET /api/sensores/[id_sensor]/estadisticas?periodo_horas=24&tipo_variable=humedad_suelo
 * Obtiene estadísticas de un sensor específico
 *
 * Query params:
 * - periodo_horas: período de análisis en horas (default: 24)
 * - tipo_variable: filtrar por tipo de variable (opcional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id_sensor: string }> },
) {
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
    const { id_sensor: id_sensor_str } = await params;
    const id_sensor = parseInt(id_sensor_str);

    if (isNaN(id_sensor)) {
      return NextResponse.json(
        {
          success: false,
          message: "El id_sensor debe ser un número válido",
        },
        { status: 400 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const periodo_horas = parseInt(searchParams.get("periodo_horas") || "24");
    const tipo_variable = searchParams.get("tipo_variable");

    // Validar que el sensor existe
    const sensor = await prisma.sensores.findUnique({
      where: { id_sensor },
    });

    if (!sensor) {
      return NextResponse.json(
        {
          success: false,
          message: `Sensor con id ${id_sensor} no encontrado`,
        },
        { status: 404 },
      );
    }

    const fecha_inicio = new Date(Date.now() - periodo_horas * 60 * 60 * 1000);

    const where: any = {
      id_sensor,
      fecha_hora: {
        gte: fecha_inicio,
      },
    };

    if (tipo_variable) {
      where.tipo_variable = tipo_variable;
    }

    const lecturas = await prisma.lecturas_sensor.findMany({
      where,
      orderBy: { fecha_hora: "asc" },
    });

    if (lecturas.length === 0) {
      return NextResponse.json(
        {
          success: true,
          sensor: sensor,
          periodo_horas,
          count: 0,
          estadisticas: {
            promedio: null,
            minimo: null,
            maximo: null,
            desviacion_estandar: null,
          },
          lecturas: [],
        },
        { status: 200 },
      );
    }

    const valores = lecturas.map((l) => parseFloat(l.valor?.toString() || "0"));
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);

    // Calcular desviación estándar
    const varianza =
      valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) /
      valores.length;
    const desviacion_estandar = Math.sqrt(varianza);

    return NextResponse.json(
      {
        success: true,
        sensor: {
          id_sensor: sensor.id_sensor,
          tipo_sensor: sensor.tipo_sensor,
          unidad: sensor.unidad,
          estado: sensor.estado,
        },
        periodo_horas,
        tipo_variable: tipo_variable || "todos",
        count: lecturas.length,
        estadisticas: {
          promedio: Math.round(promedio * 100) / 100,
          minimo: Math.round(minimo * 100) / 100,
          maximo: Math.round(maximo * 100) / 100,
          desviacion_estandar: Math.round(desviacion_estandar * 100) / 100,
        },
        primera_lectura: lecturas[0].fecha_hora,
        ultima_lectura: lecturas[lecturas.length - 1].fecha_hora,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
