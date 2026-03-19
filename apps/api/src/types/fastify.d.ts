import { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}