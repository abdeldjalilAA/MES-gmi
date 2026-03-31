import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function productionRoutes(fastify: FastifyInstance) {

  // ─── PHASE 7 — BANC D'ESSAI ──────────────────────────

  fastify.post('/orders/:orderId/test-result', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { orderId } = request.params as any
    const { load, voltage, frequency, temperature, duration,
            fuelConsumption, noiseLevel, result, notes } = request.body as any
    const user = request.user as any

    const phase = await prisma.productionPhase.findUnique({
      where: { orderId_phaseNumber: { orderId, phaseNumber: 7 } }
    })
    if (!phase) return reply.status(404).send({ error: 'Phase 7 not found' })

    const testResult = await prisma.testResult.upsert({
      where: { phaseId: phase.id },
      create: {
        phaseId: phase.id,
        operatorId: user.id,
        load: load ? parseFloat(load) : null,
        voltage: voltage ? parseFloat(voltage) : null,
        frequency: frequency ? parseFloat(frequency) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        duration: duration ? parseInt(duration) : null,
        fuelConsumption: fuelConsumption ? parseFloat(fuelConsumption) : null,
        noiseLevel: noiseLevel ? parseFloat(noiseLevel) : null,
        result,
        notes
      },
      update: {
        load: load ? parseFloat(load) : null,
        voltage: voltage ? parseFloat(voltage) : null,
        frequency: frequency ? parseFloat(frequency) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        duration: duration ? parseInt(duration) : null,
        fuelConsumption: fuelConsumption ? parseFloat(fuelConsumption) : null,
        noiseLevel: noiseLevel ? parseFloat(noiseLevel) : null,
        result,
        notes
      }
    })

    // Update phase status based on result
    if (result === 'PASS') {
      await prisma.productionPhase.update({
        where: { id: phase.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      })
      await prisma.productionOrder.update({
        where: { id: orderId },
        data: { status: 'QC' }
      })
    } else {
      await prisma.productionPhase.update({
        where: { id: phase.id },
        data: { status: 'BLOCKED' }
      })
    }

    // Log phase entry
    await prisma.phaseEntry.create({
      data: {
        action: result === 'PASS' ? 'completed' : 'blocked',
        notes: `Test ${result}: ${notes || ''}`,
        phaseId: phase.id,
        operatorId: user.id
      }
    })

    fastify.io.to(`order:${orderId}`).emit('phase-updated', { orderId, phaseNumber: 7 })

    return reply.status(201).send(testResult)
  })

  // GET TEST RESULT
  fastify.get('/orders/:orderId/test-result', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { orderId } = request.params as any
    const phase = await prisma.productionPhase.findUnique({
      where: { orderId_phaseNumber: { orderId, phaseNumber: 7 } }
    })
    if (!phase) return reply.status(404).send({ error: 'Phase not found' })

    const testResult = await prisma.testResult.findUnique({
      where: { phaseId: phase.id },
      include: { operator: { select: { name: true } } }
    })
    return reply.send(testResult)
  })

  // ─── PHASE 8 — CONFORMITÉ ────────────────────────────

  fastify.post('/orders/:orderId/conformity', {
    onRequest: [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'QC_DELIVERY_AGENT'])]
  } as any, async (request, reply) => {
    const { orderId } = request.params as any
    const { isConform, notes } = request.body as any
    const user = request.user as any

    const phase = await prisma.productionPhase.findUnique({
      where: { orderId_phaseNumber: { orderId, phaseNumber: 8 } }
    })
    if (!phase) return reply.status(404).send({ error: 'Phase 8 not found' })

    const report = await prisma.conformityReport.upsert({
      where: { phaseId: phase.id },
      create: {
        phaseId: phase.id,
        inspectorId: user.id,
        isConform,
        notes
      },
      update: { isConform, notes }
    })

    if (isConform) {
      await prisma.productionPhase.update({
        where: { id: phase.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      })

      const settings = await prisma.documentSettings.findFirst()
      const warrantyMonths = settings?.warrantyMonths || 12
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + warrantyMonths)

      await prisma.productionOrder.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      })

      await prisma.warranty.upsert({
        where: { orderId },
        create: { orderId, startDate, endDate, isActive: true },
        update: { startDate, endDate, isActive: true }
      })
    } else {
      await prisma.productionPhase.update({
        where: { id: phase.id },
        data: { status: 'BLOCKED' }
      })
      await prisma.productionOrder.update({
        where: { id: orderId },
        data: { status: 'QC' }
      })
    }

    await prisma.phaseEntry.create({
      data: {
        action: isConform ? 'completed' : 'blocked',
        notes: `Conformité: ${isConform ? 'CONFORME' : 'NON CONFORME'} — ${notes || ''}`,
        phaseId: phase.id,
        operatorId: user.id
      }
    })

    fastify.io.to(`order:${orderId}`).emit('phase-updated', { orderId, phaseNumber: 8 })

    return reply.status(201).send(report)
  })

  // GET CONFORMITY REPORT
  fastify.get('/orders/:orderId/conformity', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { orderId } = request.params as any
    const phase = await prisma.productionPhase.findUnique({
      where: { orderId_phaseNumber: { orderId, phaseNumber: 8 } }
    })
    if (!phase) return reply.status(404).send({ error: 'Phase not found' })

    const report = await prisma.conformityReport.findUnique({
      where: { phaseId: phase.id },
      include: { inspector: { select: { name: true } } }
    })
    return reply.send(report)
  })
}