import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwtPlugin from './plugins/jwt'
import rbacPlugin from './plugins/rbac'
import { authRoutes } from './modules/auth/auth.routes'
import { orderRoutes } from './modules/orders/orders.routes'

const app = Fastify({ logger: true })

app.register(cors, {
  origin: 'http://localhost:3000',
  credentials: true
})

app.register(jwtPlugin)
app.register(rbacPlugin)
app.register(authRoutes)
app.register(orderRoutes)

app.get('/health', async () => {
  return { status: 'ok', app: 'GenTrack API' }
})

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
    console.log('API running on http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()