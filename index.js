import fastify from 'fastify';
import dotenv from 'dotenv';
import setupDatabase from './database.js';
import { validateTelegramAuth } from './auth.js';

dotenv.config();

const app = fastify({ logger: true });
let db;

app.addHook('onRequest', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const initData = authHeader.split(' ')[1];
    const { isValid, user } = validateTelegramAuth(initData, process.env.TELEGRAM_BOT_TOKEN);

    if (!isValid) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Upsert user into the database
    await db.run(
      `INSERT INTO users (id, firstName, lastName, username, languageCode, isPremium, photoUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         firstName = excluded.firstName,
         lastName = excluded.lastName,
         username = excluded.username,
         languageCode = excluded.languageCode,
         isPremium = excluded.isPremium,
         photoUrl = excluded.photoUrl`,
      user.id,
      user.first_name,
      user.last_name,
      user.username,
      user.language_code,
      user.is_premium ? 1 : 0,
      user.photo_url
    );

    request.user = user;
  } catch (error) {
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

app.get('/', async (request, reply) => {
  return { hello: request.user.first_name };
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
