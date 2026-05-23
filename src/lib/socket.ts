import { Server } from 'socket.io'

let io: Server

export function getIO() {
  if (!io) {
    io = new Server({
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*'
      }
    })
  }

  return io
}