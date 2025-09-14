import { validateTelegramAuth } from '../auth.js';

export default async function authRoutes(app, options) {
  const { db } = options;

  app.post('/telegram', async (request, reply) => {
    try {
      const { initData } = request.body ?? {};

      if (!initData) {
        return reply.code(400).send({ error: 'initData is required' });
      }

      const { isValid, user } = validateTelegramAuth(initData, process.env.TELEGRAM_BOT_TOKEN);

      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid Telegram data' });
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

      const token = app.jwt.sign({ id: user.id });
      reply.send({ token });

    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}

