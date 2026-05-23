// src/app/api/cultivos/[id_cultivo]/lecturas/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * GET /api/cultivos/[id_cultivo]/lecturas?limit=100&tipo_variable=humedad_suelo
 * Obtiene todas las lecturas de sensores asociados a un cultivo
 *
 * Query params:
 * - limit: cantidad de lecturas a retornar (default: 100, max: 1000)
 * - tipo_variable: filtrar por tipo de variable (opcional)
 * - horas: obtener datos de las últimas X horas (opcional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id_cultivo: string }> },
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
    const { id_cultivo: id_cultivo_str } = await params;
    const id_cultivo = parseInt(id_cultivo_str);

    if (isNaN(id_cultivo)) {
      return NextResponse.json(
        {
          success: false,
          message: "El id_cultivo debe ser un número válido",
        },
        { status: 400 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const tipo_variable = searchParams.get("tipo_variable");
    const horas = searchParams.get("horas");

    // Validar que el cultivo existe
    const cultivo = await prisma.cultivos.findUnique({
      where: { id_cultivo },
      include: { plantas: true },
    });

    if (!cultivo) {
      return NextResponse.json(
        {
          success: false,
          message: `Cultivo con id ${id_cultivo} no encontrado`,
        },
        { status: 404 },
      );
    }

    const where: any = {
      id_cultivo,
    };

    if (tipo_variable) {
      where.tipo_variable = tipo_variable;
    }

    if (horas) {
      const fecha_inicio = new Date(
        Date.now() - parseInt(horas) * 60 * 60 * 1000,
      );
      where.fecha_hora = {
        gte: fecha_inicio,
      };
    }

    const lecturas = await prisma.lecturas_sensor.findMany({
      where,
      orderBy: { fecha_hora: "desc" },
      take: limit,
      include: {
        sensores: {
          include: { dispositivos: true },
        },
      },
    });

    // Agrupar por tipo de variable
    const lecturasAgrupadas: Record<string, any[]> = {};
    lecturas.forEach((lectura) => {
      const tipo = lectura.tipo_variable || "sin_tipo";
      if (!lecturasAgrupadas[tipo]) {
        lecturasAgrupadas[tipo] = [];
      }
      lecturasAgrupadas[tipo].push(lectura);
    });

    return NextResponse.json(
      {
        success: true,
        cultivo: {
          id_cultivo: cultivo.id_cultivo,
          nombre: cultivo.nombre,
          planta: cultivo.plantas?.nombre,
          etapa: cultivo.etapa,
          estado: cultivo.estado,
        },
        resumen: {
          total_lecturas: lecturas.length,
          tipos_variables: Object.keys(lecturasAgrupadas),
          filtros_aplicados: {
            tipo_variable: tipo_variable || "ninguno",
            horas: horas || "todas",
            limit,
          },
        },
        lecturas_agrupadas: lecturasAgrupadas,
        ultima_lectura: lecturas.length > 0 ? lecturas[0].fecha_hora : null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al obtener lecturas del cultivo:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
