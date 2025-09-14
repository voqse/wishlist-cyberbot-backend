import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import dotenv from 'dotenv'
import fastify from 'fastify'
import setupDatabase from './database.js'
import authRoutes from './routes/auth.js'
import wishlistRoutes from './routes/wishlist.js'

dotenv.config({ path: ['.env.local', '.env'] })

const app = fastify({ logger: true })
let db

app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

app.register(websocket)

app.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url
  if (url.startsWith('/auth') || url.startsWith('/wishlist/ws')) {
    return
  }

  try {
    await request.jwtVerify()
  }
  catch (err) {
    reply.send(err)
  }
})

app.get('/', async (request) => {
  return { user: request.user }
})

async function start() {
  try {
    db = await setupDatabase()
    app.register(authRoutes, { prefix: '/auth', db })
    app.register(wishlistRoutes, { prefix: '/wishlist', db })
    await app.listen({ port: 3000 })
  }
  catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
