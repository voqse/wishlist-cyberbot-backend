import fastify from 'fastify';
import setupDatabase from './database.js';

const app = fastify({ logger: true });
let db;

app.get('/', async (request, reply) => {
  return { hello: 'world' }
});

const start = async () => {
  try {
    db = await setupDatabase();
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
