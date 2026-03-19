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