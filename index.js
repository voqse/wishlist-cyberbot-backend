import fastify from 'fastify';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import setupDatabase from './database.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = fastify({ logger: true });
let db;

app.register(jwt, {
  secret: process.env.JWT_SECRET,
});

app.addHook('onRequest', async (request, reply) => {
  if (request.routerPath.startsWith('/auth')) {
    return;
  }
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

app.get('/', async (request, reply) => {
  return { user: request.user };
});

const start = async () => {
  try {
    db = await setupDatabase();
    app.register(authRoutes, { prefix: '/auth', db });
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
