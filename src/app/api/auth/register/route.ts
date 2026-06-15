// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, correo, contrasena } = body;

    if (!nombre || !correo || !contrasena) {
      return NextResponse.json(
        { message: 'Nombre, correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const fastapiUrl = process.env.FASTAPI_API_URL || 'http://127.0.0.1:8000';
    const apiKey = process.env.FASTAPI_API_KEY || 'clave_secreta_yaku_bff';

    const res = await fetch(`${fastapiUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ nombre, correo, contrasena }),
    });

    if (!res.ok) {
      const errMsg = await res.text();
      let parsedError = 'Error al registrar usuario';
      try {
        const jsonErr = JSON.parse(errMsg);
        parsedError = jsonErr.detail || parsedError;
      } catch (e) {}
      return NextResponse.json(
        { message: parsedError },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
