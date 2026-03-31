import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function adminRoutes(fastify: FastifyInstance) {

  const adminOnly = [fastify.authenticate, fastify.authorize(['SUPER_ADMIN', 'ADMIN'])]

  // ─── BRANDS ──────────────────────────────────────────

  // GET all brands (optionally filter by category)
  fastify.get('/admin/brands', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { category } = request.query as any
    const brands = await prisma.equipmentBrand.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {})
      },
      include: { models: { where: { isActive: true }, orderBy: { minKva: 'asc' } } },
      orderBy: { name: 'asc' }
    })
    return reply.send(brands)
  })

  // CREATE brand
  fastify.post('/admin/brands', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { name, category } = request.body as any

    const existing = await prisma.equipmentBrand.findUnique({
      where: { name_category: { name, category } }
    })
    if (existing) {
      return reply.status(400).send({ error: 'Brand already exists for this category' })
    }

    const brand = await prisma.equipmentBrand.create({
      data: { name, category }
    })
    return reply.status(201).send(brand)
  })

  // DELETE brand (soft delete)
  fastify.delete('/admin/brands/:id', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { id } = request.params as any
    await prisma.equipmentBrand.update({
      where: { id },
      data: { isActive: false }
    })
    return reply.send({ success: true })
  })

  // ─── MODELS ──────────────────────────────────────────

  // CREATE model under a brand
  fastify.post('/admin/brands/:brandId/models', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { brandId } = request.params as any
    const { name, minKva, maxKva } = request.body as any

    const model = await prisma.equipmentModel.create({
      data: {
        name,
        minKva: minKva ? parseFloat(minKva) : null,
        maxKva: maxKva ? parseFloat(maxKva) : null,
        brandId
      }
    })
    return reply.status(201).send(model)
  })

  // DELETE model (soft delete)
  fastify.delete('/admin/models/:id', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { id } = request.params as any
    await prisma.equipmentModel.update({
      where: { id },
      data: { isActive: false }
    })
    return reply.send({ success: true })
  })

  // ─── SERIAL CONFIG ────────────────────────────────────

  fastify.get('/admin/serial-config', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const config = await prisma.serialConfig.findFirst()
    return reply.send(config)
  })

  fastify.post('/admin/serial-config', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { prefix, separator, padLength } = request.body as any
    const existing = await prisma.serialConfig.findFirst()

    if (existing) {
      const updated = await prisma.serialConfig.update({
        where: { id: existing.id },
        data: { prefix, separator, padLength: parseInt(padLength) }
      })
      return reply.send(updated)
    } else {
      const created = await prisma.serialConfig.create({
        data: { prefix, separator, padLength: parseInt(padLength), lastNumber: 0, lastYear: 0 }
      })
      return reply.send(created)
    }
  })

  // ─── USER MANAGEMENT ─────────────────────────────────

  fastify.get('/admin/users', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return reply.send(users)
  })

  fastify.post('/admin/users', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { name, email, password, role } = request.body as any
    const bcrypt = await import('bcryptjs')
    const hashed = await bcrypt.hash(password, 10)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return reply.status(400).send({ error: 'Email already exists' })

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role }
    })
    return reply.status(201).send({
      id: user.id, name: user.name, email: user.email, role: user.role
    })
  })

  fastify.patch('/admin/users/:id/toggle', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { id } = request.params as any
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    })
    return reply.send({ id: updated.id, isActive: updated.isActive })
  })
  // ARCHIVE — all orders with filters
  fastify.get('/archive', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { year, enclosureType, controlType, clientName, status } = request.query as any

    const where: any = {}

    if (year) {
      where.createdAt = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31T23:59:59`)
      }
    }
    if (enclosureType) where.enclosureType = enclosureType
    if (controlType) where.controlType = controlType
    if (status) where.status = status
    if (clientName) {
      where.clientName = { contains: clientName, mode: 'insensitive' }
    }

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        productionPhases: { orderBy: { phaseNumber: 'asc' } },
        components: { include: { equipmentModel: { include: { brand: true } } } },
        _count: { select: { components: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send(orders)
  })

// DOCUMENT SETTINGS
  fastify.get('/admin/document-settings', async (request, reply) => {
    const settings = await prisma.documentSettings.findFirst()
    return reply.send(settings)
  })

 fastify.post('/admin/document-settings', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { companyName, headerText, footerText, warrantyMonths, logoUrl } = request.body as any
    const existing = await prisma.documentSettings.findFirst()

    if (existing) {
      const updated = await prisma.documentSettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          headerText,
          footerText,
          warrantyMonths: parseInt(warrantyMonths),
          ...(logoUrl !== undefined ? { logoUrl } : {})
        }
      })
      return reply.send(updated)
    } else {
      const created = await prisma.documentSettings.create({
        data: { companyName, headerText, footerText, warrantyMonths: parseInt(warrantyMonths), logoUrl }
      })
      return reply.send(created)
    }
  })

  // WARRANTY — get by order id
  fastify.get('/orders/:id/warranty', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { id } = request.params as any
    const warranty = await prisma.warranty.findUnique({ where: { orderId: id } })
    return reply.send(warranty)
  })
// ─── MACHINES ────────────────────────────────────────

  fastify.get('/admin/machines', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { phase } = request.query as any
    const machines = await prisma.machine.findMany({
      where: phase ? { phase: parseInt(phase) } : {},
      orderBy: [{ phase: 'asc' }, { name: 'asc' }]
    })
    return reply.send(machines)
  })

  fastify.post('/admin/machines', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { name, phase, minOperators, maxOperators } = request.body as any
    const machine = await prisma.machine.create({
      data: {
        name,
        phase: parseInt(phase),
        minOperators: parseInt(minOperators) || 1,
        maxOperators: parseInt(maxOperators) || 2,
      }
    })
    return reply.status(201).send(machine)
  })

  fastify.patch('/admin/machines/:id/status', {
    onRequest: [fastify.authenticate]
  } as any, async (request, reply) => {
    const { id } = request.params as any
    const { status, notes } = request.body as any
    const machine = await prisma.machine.update({
      where: { id },
      data: { status, notes }
    })
    return reply.send(machine)
  })

  fastify.delete('/admin/machines/:id', {
    onRequest: adminOnly
  } as any, async (request, reply) => {
    const { id } = request.params as any
    await prisma.machine.delete({ where: { id } })
    return reply.send({ success: true })
  })
}