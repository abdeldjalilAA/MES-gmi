import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'

export async function authRoutes(fastify: FastifyInstance) {

  // REGISTER (only super admin can do this later, open for now to seed first user)
  fastify.post('/auth/register', async (request, reply) => {
    const { name, email, password, role } = request.body as any

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(400).send({ error: 'Email already exists' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role }
    })

    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })
  })

  // LOGIN
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return reply.status(403).send({ error: 'Account disabled' })
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    })

    return reply.send({ token, user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }})
  })

  // GET CURRENT USER (protected)
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: (request.user as any).id },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    })
    return reply.send(user)
  })
}