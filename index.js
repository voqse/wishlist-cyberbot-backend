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

app.server.on('upgrade', async (request, socket, _head) => {
  const header = request.headers['sec-websocket-protocol']
  if (!header)
    return socket.destroy()

  const [protocol, token] = header.split(', ')
  if (protocol !== 'bearer')
    return socket.destroy()

  try {
    await app.jwt.verify(token)
  }
  catch {
    return socket.destroy()
  }
})

app.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url
  const apiPrefix = process.env.API_PREFIX || ''

  const routesWithoutAuth = [
    `/auth`,
    `/wishlist/ws`,
  ]

  const skipAuth = routesWithoutAuth
    .map(route => url.startsWith(apiPrefix + route))
    .includes(true)

  if (skipAuth) return

  try {
    await request.jwtVerify()
  }
  catch {
    reply.code(401).send({ error: 'Unauthorized' })
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
