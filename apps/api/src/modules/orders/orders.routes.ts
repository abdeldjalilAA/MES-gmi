import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function orderRoutes(fastify: FastifyInstance) {

  // CREATE ORDER (commercial agent + admin)
  fastify.post('/orders', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL_AGENT'])]
  } as any, async (request, reply) => {
    const { clientName, clientPhone, clientEmail, engineType, requirements } = request.body as any

    // Generate serial number
    const config = await prisma.serialConfig.findFirst()
    const year = new Date().getFullYear()

    let nextNumber = 1
    if (config) {
      if (config.lastYear !== year) {
        await prisma.serialConfig.update({
          where: { id: config.id },
          data: { lastNumber: 1, lastYear: year }
        })
        nextNumber = 1
      } else {
        await prisma.serialConfig.update({
          where: { id: config.id },
          data: { lastNumber: config.lastNumber + 1 }
        })
        nextNumber = config.lastNumber + 1
      }
    } else {
      await prisma.serialConfig.create({
        data: { prefix: 'GEN', lastNumber: 1, lastYear: year }
      })
      nextNumber = 1
    }

    const padded = String(nextNumber).padStart(config?.padLength || 4, '0')
    const serialNumber = config
      ? `${year}${config.separator}${config.prefix}${config.separator}${padded}`
      : `${year}-GEN-${padded}`

    const order = await prisma.productionOrder.create({
      data: {
        serialNumber,
        clientName,
        clientPhone,
        clientEmail,
        engineType,
        requirements,
      }
    })

    // Auto-create all 8 phases for this order
    await prisma.productionPhase.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        phaseNumber: i + 1,
        orderId: order.id,
      }))
    })

    return reply.status(201).send(order)
  })

  // GET ALL ORDERS
  fastify.get('/orders', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const orders = await prisma.productionOrder.findMany({
      include: {
        productionPhases: {
          orderBy: { phaseNumber: 'asc' }
        },
        _count: { select: { components: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return reply.send(orders)
  })

  // GET SINGLE ORDER BY SERIAL (QR scan)
  fastify.get('/orders/serial/:serial', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { serial } = request.params as any

    const order = await prisma.productionOrder.findUnique({
      where: { serialNumber: serial },
      include: {
        components: { include: { componentType: true } },
        productionPhases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            supervisor: { select: { name: true, role: true } },
            entries: {
              include: {
                operator: { select: { name: true, role: true } },
                machine: true
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        warranty: true
      }
    })

    if (!order) return reply.status(404).send({ error: 'Order not found' })
    return reply.send(order)
  })

  // UPDATE PHASE STATUS (operator/supervisor)
  fastify.post('/orders/:orderId/phases/:phaseNumber/entry', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { orderId, phaseNumber } = request.params as any
    const { action, notes, machineId } = request.body as any
    const user = request.user as any

    const phase = await prisma.productionPhase.findUnique({
      where: { orderId_phaseNumber: { orderId, phaseNumber: parseInt(phaseNumber) } }
    })

    if (!phase) return reply.status(404).send({ error: 'Phase not found' })

    // Create the entry log
    const entry = await prisma.phaseEntry.create({
      data: {
        action,
        notes,
        phaseId: phase.id,
        operatorId: user.id,
        machineId: machineId || null
      }
    })

    // Update phase status
    let phaseUpdate: any = {}
    if (action === 'started') {
      phaseUpdate = { status: 'IN_PROGRESS', startedAt: new Date() }
    } else if (action === 'completed') {
      const startedAt = phase.startedAt || new Date()
      const delayMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000)
      phaseUpdate = { status: 'COMPLETED', completedAt: new Date(), delayMinutes }
    } else if (action === 'blocked') {
      phaseUpdate = { status: 'BLOCKED' }
    }

    await prisma.productionPhase.update({
      where: { id: phase.id },
      data: phaseUpdate
    })

    return reply.status(201).send(entry)
  })

  // GET SINGLE ORDER BY ID
  fastify.get('/orders/:id', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { id } = request.params as any

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        components: { include: { componentType: true } },
        productionPhases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            supervisor: { select: { name: true, role: true } },
            entries: {
              include: {
                operator: { select: { name: true, role: true } },
                machine: true
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        warranty: true
      }
    })

    if (!order) return reply.status(404).send({ error: 'Order not found' })
    return reply.send(order)
  })
}