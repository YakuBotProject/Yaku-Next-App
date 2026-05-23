//src/app/api/auth/device

import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()

  const { deviceId, secret } = body

  // validar credenciales del dispositivo
  if (
    deviceId !== process.env.DEVICE_ID ||
    secret !== process.env.DEVICE_SECRET
  ) {
    return NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    )
  }

  const token = jwt.sign(
    {
      deviceId
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '30d'
    }
  )

  return NextResponse.json({
    token
  })
}