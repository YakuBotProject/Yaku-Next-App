// src/app/api/sensores/batch/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * POST /api/sensores/batch
 * Recibe múltiples lecturas de sensores en un solo request
 *
 * Body:
 * {
 *   "lecturas": [
 *     {
 *       "id_sensor": 1,
 *       "id_cultivo": 1,
 *       "valor": 65.5,
 *       "tipo_variable": "humedad_suelo"
 *     },
 *     {
 *       "id_sensor": 2,
 *       "id_cultivo": 1,
 *       "valor": 24.5,
 *       "tipo_variable": "temperatura"
 *     }
 *   ]
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
    const { lecturas } = body;

    if (!Array.isArray(lecturas) || lecturas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere un array de lecturas",
        },
        { status: 400 },
      );
    }

    // Validar cada lectura
    const lecturasValidas = [];
    const errores = [];

    for (let i = 0; i < lecturas.length; i++) {
      const { id_sensor, id_cultivo, valor, tipo_variable } = lecturas[i];

      if (!id_sensor || !id_cultivo || valor === undefined || !tipo_variable) {
        errores.push({
          indice: i,
          error: "Faltan campos: id_sensor, id_cultivo, valor, tipo_variable",
        });
        continue;
      }

      // Validar sensor
      const sensor = await prisma.sensores.findUnique({
        where: { id_sensor: parseInt(id_sensor) },
      });

      if (!sensor) {
        errores.push({
          indice: i,
          error: `Sensor ${id_sensor} no encontrado`,
        });
        continue;
      }

      // Validar cultivo
      const cultivo = await prisma.cultivos.findUnique({
        where: { id_cultivo: parseInt(id_cultivo) },
      });

      if (!cultivo) {
        errores.push({
          indice: i,
          error: `Cultivo ${id_cultivo} no encontrado`,
        });
        continue;
      }

      lecturasValidas.push({
        id_sensor: parseInt(id_sensor),
        id_cultivo: parseInt(id_cultivo),
        valor: parseFloat(valor),
        tipo_variable: tipo_variable.toString(),
        fecha_hora: new Date(),
      });
    }

    if (lecturasValidas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Ninguna lectura fue válida",
          errores,
        },
        { status: 400 },
      );
    }

    // Insertar todas las lecturas válidas
    const resultado = await prisma.lecturas_sensor.createMany({
      data: lecturasValidas,
      skipDuplicates: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${resultado.count} lecturas registradas correctamente`,
        insertadas: resultado.count,
        intentadas: lecturas.length,
        errores: errores.length > 0 ? errores : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al registrar lecturas batch:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
