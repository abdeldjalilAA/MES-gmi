import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'
import jwtPlugin from './plugins/jwt'
import rbacPlugin from './plugins/rbac'
import { authRoutes } from './modules/auth/auth.routes'
import { orderRoutes } from './modules/orders/orders.routes'
import { adminRoutes } from './modules/admin/admin.routes'
import { productionRoutes } from './modules/production/production.routes'
import { queueRoutes } from './modules/production/queue.routes'
const app = Fastify({ logger: true })

// Declare io decorator before start
app.decorate('io', null as any)

app.register(cors, {
  origin: 'http://localhost:3000',
  credentials: true
})

app.register(jwtPlugin)
app.register(rbacPlugin)
app.register(authRoutes)
app.register(orderRoutes)
app.register(adminRoutes)
app.register(productionRoutes)
app.register(queueRoutes)
app.get('/health', async () => {
  return { status: 'ok', app: 'GenTrack API' }
})

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })

    const io = new Server(app.server, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    // Set the io instance on the decorator
    app.io = io

    io.on('connection', (socket) => {
      app.log.info(`Socket connected: ${socket.id}`)

      socket.on('join-order', (orderId: string) => {
        socket.join(`order:${orderId}`)
      })
      socket.on('join-machine', (machineId: string) => {
        socket.join(`machine:${machineId}`)
      })

      socket.on('disconnect', () => {
        app.log.info(`Socket disconnected: ${socket.id}`)
      })
    })

    console.log('API running on http://localhost:3001')
    console.log('Socket.io ready')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()