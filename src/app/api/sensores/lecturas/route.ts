// src/app/api/sensores/lecturas/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * POST /api/sensores/lecturas
 * Recibe datos de sensores y los guarda en la tabla lecturas_sensor
 *
 * Body:
 * {
 *   "id_sensor": 1,
 *   "id_cultivo": 1,
 *   "valor": 65.5,
 *   "tipo_variable": "humedad_suelo"
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { id_sensor, id_cultivo, valor, tipo_variable } = body;

    // Validaciones básicas
    if (!id_sensor || !id_cultivo || valor === undefined || !tipo_variable) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faltan campos requeridos: id_sensor, id_cultivo, valor, tipo_variable",
        },
        { status: 400 },
      );
    }

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

    // Validar que el cultivo existe
    const cultivo = await prisma.cultivos.findUnique({
      where: { id_cultivo },
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

    // Crear la lectura
    const lectura = await prisma.lecturas_sensor.create({
      data: {
        id_sensor: parseInt(id_sensor),
        id_cultivo: parseInt(id_cultivo),
        valor: parseFloat(valor),
        tipo_variable: tipo_variable.toString(),
        fecha_hora: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lectura registrada correctamente",
        data: {
          id_lectura: lectura.id_lectura,
          id_sensor: lectura.id_sensor,
          id_cultivo: lectura.id_cultivo,
          valor: lectura.valor,
          tipo_variable: lectura.tipo_variable,
          fecha_hora: lectura.fecha_hora,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al registrar lectura:", error);
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
 * GET /api/sensores/lecturas?id_sensor=1&limit=100
 * Obtiene las últimas lecturas de un sensor
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
    const id_sensor = searchParams.get("id_sensor");
    const id_cultivo = searchParams.get("id_cultivo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000); // Máximo 1000

    if (!id_sensor && !id_cultivo) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere id_sensor o id_cultivo como parámetro",
        },
        { status: 400 },
      );
    }

    const where: any = {};
    if (id_sensor) where.id_sensor = parseInt(id_sensor);
    if (id_cultivo) where.id_cultivo = parseInt(id_cultivo);

    const lecturas = await prisma.lecturas_sensor.findMany({
      where,
      orderBy: { fecha_hora: "desc" },
      take: limit,
      include: {
        sensores: true,
        cultivos: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: lecturas.length,
        data: lecturas,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al obtener lecturas:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
