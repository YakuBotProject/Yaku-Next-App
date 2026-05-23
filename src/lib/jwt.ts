import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    return {
      valid: true,
      decoded
    }
  } catch (error) {
    return {
      valid: false,
      decoded: null
    }
  }
}