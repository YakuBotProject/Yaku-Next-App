// src/app/api/dispositivos/[id_dispositivo]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

/**
 * GET /api/dispositivos/[id_dispositivo]
 * Obtiene información de un dispositivo y sus sensores asociados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id_dispositivo: string }> },
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
    const { id_dispositivo: id_dispositivo_str } = await params;
    const id_dispositivo = parseInt(id_dispositivo_str);

    if (isNaN(id_dispositivo)) {
      return NextResponse.json(
        {
          success: false,
          message: "El id_dispositivo debe ser un número válido",
        },
        { status: 400 },
      );
    }

    const dispositivo = await prisma.dispositivos.findUnique({
      where: { id_dispositivo },
      include: {
        sensores: {
          include: {
            lecturas_sensor: {
              orderBy: { fecha_hora: "desc" },
              take: 1, // Última lectura
            },
          },
        },
        riego: {
          orderBy: { fecha_hora: "desc" },
          take: 5, // Últimos 5 eventos
        },
      },
    });

    if (!dispositivo) {
      return NextResponse.json(
        {
          success: false,
          message: `Dispositivo con id ${id_dispositivo} no encontrado`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: dispositivo,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al obtener dispositivo:", error);
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
 * PUT /api/dispositivos/[id_dispositivo]
 * Actualiza el estado de un dispositivo
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id_dispositivo: string }> },
) {
  try {
    const { id_dispositivo: id_dispositivo_str } = await params;
    const id_dispositivo = parseInt(id_dispositivo_str);

    if (isNaN(id_dispositivo)) {
      return NextResponse.json(
        {
          success: false,
          message: "El id_dispositivo debe ser un número válido",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { estado } = body;

    if (!estado) {
      return NextResponse.json(
        {
          success: false,
          message: 'El campo "estado" es requerido',
        },
        { status: 400 },
      );
    }

    const dispositivo = await prisma.dispositivos.update({
      where: { id_dispositivo },
      data: { estado },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Dispositivo actualizado a estado: ${estado}`,
        data: dispositivo,
      },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: `Dispositivo no encontrado`,
        },
        { status: 404 },
      );
    }
    console.error("Error al actualizar dispositivo:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
