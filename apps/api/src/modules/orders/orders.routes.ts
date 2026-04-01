import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import QRCode from 'qrcode'
export async function orderRoutes(fastify: FastifyInstance) {

  // CREATE ORDER
  fastify.post('/orders', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL_AGENT'])]
  } as any, async (request, reply) => {
    const { clientName, clientPhone, clientEmail, enclosureType, controlType, requirements } = request.body as any

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
        enclosureType,
        controlType,
        requirements,
      }
    })

    await prisma.productionPhase.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        phaseNumber: i + 1,
        orderId: order.id,
      }))
    })

    const qrData = `${process.env.APP_URL || 'http://localhost:3000'}/scan/${order.serialNumber}`
    const qrCode = await QRCode.toDataURL(qrData)

    await prisma.productionOrder.update({
      where: { id: order.id },
      data: { qrCode }
    })


    
    return reply.status(201).send({ ...order, qrCode })
  })

  // GET ALL ORDERS
  fastify.get('/orders', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const orders = await prisma.productionOrder.findMany({
      include: {
        productionPhases: { orderBy: { phaseNumber: 'asc' } },
        _count: { select: { components: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return reply.send(orders)
  })

  // GET BY SERIAL (QR scan)
  fastify.get('/orders/serial/:serial', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { serial } = request.params as any

    const order = await prisma.productionOrder.findUnique({
      where: { serialNumber: serial },
      include: {
        components: { include: { equipmentModel: { include: { brand: true } } } },
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

  // GET BY ID
  fastify.get('/orders/:id', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { id } = request.params as any

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        components: { include: { equipmentModel: { include: { brand: true } } } },
        productionPhases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            supervisor: { select: { name: true, role: true } },
            testResult: true,
            conformityReport: { include: { inspector: { select: { name: true } } } },
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

  // PHASE ENTRY
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

    const entry = await prisma.phaseEntry.create({
      data: {
        action,
        notes,
        phaseId: phase.id,
        operatorId: user.id,
        machineId: machineId || null
      }
    })

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

    // Auto-update order status based on phase completion
    if (action === 'completed') {
      if (parseInt(phaseNumber) === 6) {
        await prisma.productionOrder.update({
          where: { id: orderId },
          data: { status: 'TESTING' }
        })
      } else if (parseInt(phaseNumber) === 7) {
        await prisma.productionOrder.update({
          where: { id: orderId },
          data: { status: 'QC' }
        })
      } else if (parseInt(phaseNumber) === 8) {
        // Get warranty duration from settings
        const settings = await prisma.documentSettings.findFirst()
        const warrantyMonths = settings?.warrantyMonths || 12
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + warrantyMonths)

        await prisma.productionOrder.update({
          where: { id: orderId },
          data: { status: 'DELIVERED', deliveredAt: new Date() }
        })

        // Create warranty
        await prisma.warranty.upsert({
          where: { orderId },
          create: { orderId, startDate, endDate, isActive: true },
          update: { startDate, endDate, isActive: true }
        })
      } else if (parseInt(phaseNumber) === 1) {
        await prisma.productionOrder.update({
          where: { id: orderId },
          data: { status: 'IN_PRODUCTION' }
        })
      }
    }
// Emit real-time update to all clients watching this order
    fastify.io.to(`order:${orderId}`).emit('phase-updated', {
      orderId,
      phaseNumber: parseInt(phaseNumber),
      status: phaseUpdate.status,
      completedAt: phaseUpdate.completedAt,
      delayMinutes: phaseUpdate.delayMinutes
    })
    return reply.status(201).send(entry)
  })

  // ADD COMPONENT
  fastify.post('/orders/:id/components', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { id } = request.params as any
    const { equipmentModelId, serialNumber, notes } = request.body as any

    const component = await prisma.engineComponent.create({
      data: {
        serialNumber,
        notes,
        orderId: id,
        equipmentModelId: equipmentModelId || null
      }
    })

    return reply.status(201).send(component)
  })
  // GET ACTIVE ORDERS FOR OPERATOR VIEW
// GET ACTIVE ORDERS FOR OPERATOR VIEW — filtered by operator's entries
  fastify.get('/operator/orders', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const user = request.user as any

    const orders = await prisma.productionOrder.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PRODUCTION', 'TESTING', 'QC'] }
      },
      include: {
        productionPhases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            entries: {
              include: { operator: { select: { name: true, id: true } } },
              orderBy: { createdAt: 'desc' },
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send(orders)
  })

  // OPERATOR PERSONAL STATS
  fastify.get('/operator/stats', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const user = request.user as any

    const completedEntries = await prisma.phaseEntry.findMany({
      where: {
        operatorId: user.id,
        action: 'completed'
      },
      include: {
        phase: {
          include: {
            order: { select: { serialNumber: true, clientName: true, enclosureType: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalCompleted = completedEntries.length
    const thisMonth = completedEntries.filter(e => {
      const d = new Date(e.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return reply.send({
      totalCompleted,
      thisMonth,
      recentHistory: completedEntries.slice(0, 10)
    })
  })

  // PUBLIC scan endpoint — no auth needed
  fastify.get('/public/scan/:serial', async (request, reply) => {
    const { serial } = request.params as any

    const order = await prisma.productionOrder.findUnique({
      where: { serialNumber: serial },
      include: {
        components: {
          include: { equipmentModel: { include: { brand: true } } }
        },
        productionPhases: {
          orderBy: { phaseNumber: 'asc' },
          include: {
            entries: {
              include: { operator: { select: { name: true } } },
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        warranty: true
      }
    })

    if (!order) return reply.status(404).send({ error: 'Engine not found' })
    return reply.send(order)
  })
  // UPDATE ORDER (client info + requirements)
  fastify.patch('/orders/:id', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL_AGENT', 'PROCUREMENT_AGENT'])]
  } as any, async (request, reply) => {
    const { id } = request.params as any
    const { clientName, clientPhone, clientEmail, requirements } = request.body as any

    const order = await prisma.productionOrder.update({
      where: { id },
      data: { clientName, clientPhone, clientEmail, requirements }
    })
    return reply.send(order)
  })

  // DELETE COMPONENT
  fastify.delete('/orders/:id/components/:componentId', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_AGENT'])]
  } as any, async (request, reply) => {
    const { componentId } = request.params as any
    await prisma.engineComponent.delete({ where: { id: componentId } })
    return reply.send({ success: true })
  })

  // UPDATE COMPONENT
  fastify.patch('/orders/:id/components/:componentId', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_AGENT'])]
  } as any, async (request, reply) => {
    const { componentId } = request.params as any
    const { equipmentModelId, serialNumber, notes } = request.body as any

    const component = await prisma.engineComponent.update({
      where: { id: componentId },
      data: { equipmentModelId, serialNumber, notes }
    })
    return reply.send(component)
  })
}