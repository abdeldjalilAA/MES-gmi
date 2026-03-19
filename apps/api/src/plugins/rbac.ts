import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'

export default fp(async (fastify) => {
  fastify.decorate('authorize', function(roles: string[]) {
    return async function(request: FastifyRequest, reply: FastifyReply) {
      const user = request.user as any
      if (!roles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden — insufficient role' })
      }
    }
  })
})