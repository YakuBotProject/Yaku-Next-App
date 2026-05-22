// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hash } from 'argon2'

export async function POST(request: NextRequest) {
  try {
    const { nombre, correo, contrasena } = await request.json()

    // Validaciones
    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    if (nombre.length < 3) {
      return NextResponse.json(
        { message: 'El nombre debe tener al menos 3 caracteres' },
        { status: 400 }
      )
    }

    if (contrasena.length < 8) {
      return NextResponse.json(
        { message: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Validar que el correo no exista
    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { correo }
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { message: 'El correo ya está registrado' },
        { status: 409 }
      )
    }

    // Hash de la contraseña
    const contraseniaHasheada = await hash(contrasena, {
      type: 2, // ARGON2_ID
      memoryCost: 19 * 1024,
      timeCost: 2,
      parallelism: 1
    })

    // Obtener el rol de "Agricultor" (asumir que existe)
    const rolAgricultor = await prisma.roles.findFirst({
      where: { nombre: 'Agricultor' }
    })

    if (!rolAgricultor) {
      return NextResponse.json(
        { message: 'Error en la configuración del sistema' },
        { status: 500 }
      )
    }

    // Crear el nuevo usuario
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre,
        correo,
        contrasena: contraseniaHasheada,
        id_rol: rolAgricultor.id_rol,
        estado: true
      }
    })

    // Log del registro
    await prisma.logs_sistema.create({
      data: {
        id_usuario: nuevoUsuario.id_usuario,
        accion: 'registro',
        descripcion: `Nuevo usuario registrado: ${nuevoUsuario.nombre}`
      }
    })

    return NextResponse.json(
      { 
        message: 'Registro exitoso',
        user: {
          id_usuario: nuevoUsuario.id_usuario,
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
