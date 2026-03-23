import { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'
import { Server } from 'socket.io'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    io: Server
  }
}