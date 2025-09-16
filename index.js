import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import fastify from 'fastify'
import initBot from './bot.js'
import setupDatabase from './database.js'
import apiRoutes from './routes/index.js'

const app = fastify({ logger: true })

app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

app.register(websocket)

app.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url
  const apiPrefix = process.env.API_PREFIX || ''

  // Exclude auth routes and WebSocket connections from JWT verification
  if (url.startsWith(`${apiPrefix}/auth`) || url.startsWith(`${apiPrefix}/wishlist/ws`)) {
    return
  }

  // Only apply JWT verification for routes under the API prefix
  if (url.startsWith(apiPrefix)) {
    try {
      await request.jwtVerify()
    }
    catch (err) {
      reply.send(err)
    }
  }
})

async function start() {
  try {
    const db = await setupDatabase()
    await initBot(db)
    app.register(apiRoutes, { prefix: process.env.API_PREFIX || '', db })
    await app.listen({ port: 3000 })
  }
  catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
