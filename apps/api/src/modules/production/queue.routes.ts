import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function queueRoutes(fastify: FastifyInstance) {

  // GET machine queue status
  fastify.get('/machines/:machineId/queue', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId } = request.params as any

    const queue = await prisma.machineQueueEntry.findMany({
      where: { machineId, status: { in: ['WAITING', 'ACTIVE', 'PAUSED'] } },
      include: {
        order: { select: { serialNumber: true, clientName: true, enclosureType: true } },
        operator: { select: { name: true } }
      },
      orderBy: [{ isUrgent: 'desc' }, { position: 'asc' }]
    })

    return reply.send(queue)
  })

  // ADD order to machine queue
  fastify.post('/machines/:machineId/queue', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId } = request.params as any
    const { orderId, phaseId, isUrgent } = request.body as any
    const user = request.user as any

    // Get current queue length
    const existingCount = await prisma.machineQueueEntry.count({
      where: { machineId, status: { in: ['WAITING', 'ACTIVE', 'PAUSED'] } }
    })

    // If urgent, insert at position 1 (after active)
    const position = isUrgent ? 1 : existingCount + 1

    // If urgent, shift others down
    if (isUrgent) {
      await prisma.machineQueueEntry.updateMany({
        where: { machineId, status: 'WAITING' },
        data: { position: { increment: 1 } }
      })
    }

    const entry = await prisma.machineQueueEntry.create({
      data: {
        machineId,
        orderId,
        phaseId,
        operatorId: user.id,
        position,
        isUrgent: isUrgent || false,
        status: existingCount === 0 ? 'ACTIVE' : 'WAITING',
        startedAt: existingCount === 0 ? new Date() : null
      },
      include: {
        order: { select: { serialNumber: true, clientName: true } }
      }
    })

    fastify.io.to(`machine:${machineId}`).emit('queue-updated', { machineId })

    return reply.status(201).send(entry)
  })

  // START next in queue
  fastify.post('/machines/:machineId/queue/start-next', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId } = request.params as any

    const next = await prisma.machineQueueEntry.findFirst({
      where: { machineId, status: 'WAITING' },
      orderBy: [{ isUrgent: 'desc' }, { position: 'asc' }]
    })

    if (!next) return reply.send({ message: 'Queue empty' })

    const updated = await prisma.machineQueueEntry.update({
      where: { id: next.id },
      data: { status: 'ACTIVE', startedAt: new Date() },
      include: { order: { select: { serialNumber: true, clientName: true } } }
    })

    fastify.io.to(`machine:${machineId}`).emit('queue-updated', { machineId })
    return reply.send(updated)
  })

  // PAUSE active entry
  fastify.post('/machines/:machineId/queue/:entryId/pause', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId, entryId } = request.params as any

    const entry = await prisma.machineQueueEntry.findUnique({ where: { id: entryId } })
    if (!entry) return reply.status(404).send({ error: 'Entry not found' })

    const activeMinutes = entry.startedAt
      ? Math.floor((Date.now() - entry.startedAt.getTime()) / 60000)
      : 0

    const updated = await prisma.machineQueueEntry.update({
      where: { id: entryId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        activeMinutes: (entry.activeMinutes || 0) + activeMinutes
      }
    })

    // Auto-start next waiting
    const next = await prisma.machineQueueEntry.findFirst({
      where: { machineId, status: 'WAITING' },
      orderBy: [{ isUrgent: 'desc' }, { position: 'asc' }]
    })

    if (next) {
      await prisma.machineQueueEntry.update({
        where: { id: next.id },
        data: { status: 'ACTIVE', startedAt: new Date() }
      })
    }

    fastify.io.to(`machine:${machineId}`).emit('queue-updated', { machineId })
    return reply.send(updated)
  })

  // COMPLETE active entry
  fastify.post('/machines/:machineId/queue/:entryId/complete', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId, entryId } = request.params as any

    const entry = await prisma.machineQueueEntry.findUnique({ where: { id: entryId } })
    if (!entry) return reply.status(404).send({ error: 'Entry not found' })

    const activeMinutes = entry.startedAt
      ? Math.floor((Date.now() - entry.startedAt.getTime()) / 60000)
      : 0

    await prisma.machineQueueEntry.update({
      where: { id: entryId },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        activeMinutes: (entry.activeMinutes || 0) + activeMinutes
      }
    })

    // Auto-start next waiting
    const next = await prisma.machineQueueEntry.findFirst({
      where: { machineId, status: 'WAITING' },
      orderBy: [{ isUrgent: 'desc' }, { position: 'asc' }]
    })

    if (next) {
      await prisma.machineQueueEntry.update({
        where: { id: next.id },
        data: { status: 'ACTIVE', startedAt: new Date() }
      })
    }

    fastify.io.to(`machine:${machineId}`).emit('queue-updated', { machineId })
    return reply.send({ success: true })
  })

  // RESUME paused entry
  fastify.post('/machines/:machineId/queue/:entryId/resume', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId, entryId } = request.params as any

    // Pause any currently active entry first
    const active = await prisma.machineQueueEntry.findFirst({
      where: { machineId, status: 'ACTIVE' }
    })

    if (active) {
      const activeMinutes = active.startedAt
        ? Math.floor((Date.now() - active.startedAt.getTime()) / 60000)
        : 0
      await prisma.machineQueueEntry.update({
        where: { id: active.id },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          activeMinutes: (active.activeMinutes || 0) + activeMinutes
        }
      })
    }

    const updated = await prisma.machineQueueEntry.update({
      where: { id: entryId },
      data: { status: 'ACTIVE', startedAt: new Date(), pausedAt: null }
    })

    fastify.io.to(`machine:${machineId}`).emit('queue-updated', { machineId })
    return reply.send(updated)
  })

  // ASSIGN operator to machine
  fastify.post('/machines/:machineId/assign', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'PHASE_SUPERVISOR'])]
  } as any, async (request, reply) => {
    const { machineId } = request.params as any
    const { operatorId } = request.body as any

    const assignment = await prisma.machineAssignment.upsert({
      where: { machineId_operatorId: { machineId, operatorId } },
      create: { machineId, operatorId },
      update: {}
    })

    return reply.status(201).send(assignment)
  })

  // REMOVE operator from machine
  fastify.delete('/machines/:machineId/assign/:operatorId', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'PHASE_SUPERVISOR'])]
  } as any, async (request, reply) => {
    const { machineId, operatorId } = request.params as any
    await prisma.machineAssignment.delete({
      where: { machineId_operatorId: { machineId, operatorId } }
    })
    return reply.send({ success: true })
  })

  // GET machine with assignments
  fastify.get('/machines/:machineId', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { machineId } = request.params as any
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        assignments: {
          include: { operator: { select: { id: true, name: true, role: true } } }
        },
        queueEntries: {
          where: { status: { in: ['WAITING', 'ACTIVE', 'PAUSED'] } },
          include: {
            order: { select: { serialNumber: true, clientName: true } },
            operator: { select: { name: true } }
          },
          orderBy: [{ isUrgent: 'desc' }, { position: 'asc' }]
        }
      }
    })
    return reply.send(machine)
  })
}