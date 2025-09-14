import crypto from 'crypto';

export default async function wishlistRoutes(app, options) {
  const { db } = options;

  app.get('/', async (request, reply) => {
    try {
      const authenticatedUserId = request.user.id;

      // Get wishlist and creator for the authenticated user
      let wishlist = await db.get(
        `SELECT
           w.id,
           w.shareId,
           w.title,
           w.createdAt,
           json_object(
             'id', u.id,
             'firstName', u.firstName,
             'lastName', u.lastName,
             'username', u.username,
             'photoUrl', u.photoUrl
           ) as createdBy
         FROM wishlists w
         JOIN users u ON w.createdBy = u.id
         WHERE w.createdBy = ?`,
        authenticatedUserId
      );

      if (!wishlist) {
        // User exists but has no wishlist, create one
        const shareId = crypto.randomBytes(8).toString('hex');
        const result = await db.run(
          'INSERT INTO wishlists (title, createdBy, createdAt, shareId) VALUES (?, ?, ?, ?)',
          'My Wishlist',
          authenticatedUserId,
          new Date().toISOString(),
          shareId
        );

        wishlist = await db.get('SELECT *, ? as shareId FROM wishlists WHERE id = ?', shareId, result.lastID);
        wishlist.items = [];
        const user = await db.get('SELECT * FROM users WHERE id = ?', authenticatedUserId);
        wishlist.createdBy = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photoUrl: user.photoUrl
        };
        return reply.send(wishlist);
      }

      wishlist.createdBy = JSON.parse(wishlist.createdBy);

      // The rest of the logic remains the same as the shared route
      const items = await db.all(
        `SELECT
           i.id, i.text, i.links, i.photos, i.createdAt, i.createdBy, i.reservedAt,
           CASE WHEN i.reservedBy IS NOT NULL THEN json_object('id', u.id, 'firstName', u.firstName, 'lastName', u.lastName, 'username', u.username, 'photoUrl', u.photoUrl) ELSE NULL END as reservedBy
         FROM items i
         LEFT JOIN users u ON i.reservedBy = u.id
         WHERE i.wishlistId = ?`,
        wishlist.id
      );

      wishlist.items = items.map(item => {
        const { reservedBy, ...rest } = item;
        const result = {
          ...rest,
          links: item.links ? JSON.parse(item.links) : [],
          photos: item.photos ? JSON.parse(item.photos) : [],
          isReserved: !!reservedBy
        };
        return result;
      });

      reply.send(wishlist);

    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  app.get('/:shareId', async (request, reply) => {
    try {
      const { shareId } = request.params;
      const authenticatedUserId = request.user.id;

      // Get wishlist and creator by shareId
      const wishlist = await db.get(
        `SELECT
           w.id,
           w.shareId,
           w.title,
           w.createdAt,
           json_object(
             'id', u.id,
             'firstName', u.firstName,
             'lastName', u.lastName,
             'username', u.username,
             'photoUrl', u.photoUrl
           ) as createdBy
         FROM wishlists w
         JOIN users u ON w.createdBy = u.id
         WHERE w.shareId = ?`,
        shareId
      );

      if (!wishlist) {
        return reply.code(404).send({ error: 'Wishlist not found' });
      }

      wishlist.createdBy = JSON.parse(wishlist.createdBy);

      // Get items for the wishlist
      const items = await db.all(
        `SELECT
           i.id, i.text, i.links, i.photos, i.createdAt, i.createdBy, i.reservedAt,
           CASE WHEN i.reservedBy IS NOT NULL THEN json_object('id', u.id, 'firstName', u.firstName, 'lastName', u.lastName, 'username', u.username, 'photoUrl', u.photoUrl) ELSE NULL END as reservedBy
         FROM items i
         LEFT JOIN users u ON i.reservedBy = u.id
         WHERE i.wishlistId = ?`,
        wishlist.id
      );

      const isOwner = authenticatedUserId == wishlist.createdBy.id;

      wishlist.items = items.map(item => {
        const { reservedBy, ...rest } = item;
        const result = {
          ...rest,
          links: item.links ? JSON.parse(item.links) : [],
          photos: item.photos ? JSON.parse(item.photos) : [],
        };

        if (reservedBy) {
          const reservedByUser = JSON.parse(reservedBy);
          if (!isOwner) {
            result.reservedBy = reservedByUser;
          }
          result.isReserved = true;
        } else {
          result.isReserved = false;
        }

        return result;
      });

      reply.send(wishlist);

    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}
