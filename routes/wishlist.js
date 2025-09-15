import crypto from 'node:crypto'

const connections = new Map()

async function getWishlist(db, shareId, authenticatedUserId) {
  // Get wishlist and creator by shareId
  const wishlist = await db.get(
    `SELECT
       w.id,
       w.shareId,
       w.title,
       w.createdAt,
       w.updatedAt,
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
    shareId,
  )

  if (!wishlist) {
    return null
  }

  wishlist.createdBy = JSON.parse(wishlist.createdBy)

  // Get items for the wishlist
  const items = await db.all(
    `SELECT
       i.id, i.text, i.links, i.photos, i.createdAt, i.updatedAt, i.createdBy, i.reservedAt,
       CASE WHEN i.reservedBy IS NOT NULL THEN json_object('id', u.id, 'firstName', u.firstName, 'lastName', u.lastName, 'username', u.username, 'photoUrl', u.photoUrl) ELSE NULL END as reservedBy
     FROM items i
     LEFT JOIN users u ON i.reservedBy = u.id
     WHERE i.wishlistId = ?`,
    wishlist.id,
  )

  const isOwner = authenticatedUserId === wishlist.createdBy.id

  wishlist.items = items.map((item) => {
    const { reservedBy, ...rest } = item
    const result = {
      ...rest,
      links: item.links ? JSON.parse(item.links) : [],
      photos: item.photos ? JSON.parse(item.photos) : [],
      reservedBy: null,
    }

    if (reservedBy && !isOwner) {
      result.reservedBy = JSON.parse(reservedBy)
    }

    return result
  })

  return wishlist
}

async function broadcast(shareId, app, db, user) {
  const clients = connections.get(shareId)
  if (clients) {
    app.log.info(`Broadcasting to ${clients.size} clients for wishlist ${shareId}`)
    for (const client of clients) {
      const wishlist = await getWishlist(db, shareId, user.id)
      client.send(JSON.stringify(wishlist))
    }
  }
}

export default async function wishlistRoutes(app, options) {
  const { db } = options

  app.get('/ws/:shareId', { websocket: true }, (socket, request) => {
    const { shareId } = request.params

    if (!connections.has(shareId)) {
      connections.set(shareId, new Set())
    }
    const clients = connections.get(shareId)
    clients.add(socket)
    app.log.info(`New client connected for wishlist ${shareId}. Total clients: ${clients.size}`)

    socket.on('message', () => socket.send('pong'))

    socket.on('close', () => {
      clients.delete(socket)
      app.log.info(`Client disconnected from wishlist ${shareId}. Total clients: ${clients.size}`)
      if (clients.size === 0) {
        connections.delete(shareId)
      }
    })
  })

  app.get('/', async (request, reply) => {
    try {
      const authenticatedUserId = request.user.id

      // Get wishlist and creator for the authenticated user
      let wishlist = await db.get(
        `SELECT
           w.id,
           w.shareId,
           w.title,
           w.createdAt,
           w.updatedAt,
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
        authenticatedUserId,
      )

      if (!wishlist) {
        // User exists but has no wishlist, create one
        const now = new Date().toISOString()
        const shareId = crypto.randomBytes(8).toString('hex')
        const result = await db.run(
          'INSERT INTO wishlists (title, createdBy, createdAt, updatedAt, shareId) VALUES (?, ?, ?, ?, ?)',
          'My Wishlist',
          authenticatedUserId,
          now,
          now,
          shareId,
        )

        wishlist = await db.get('SELECT *, ? as shareId FROM wishlists WHERE id = ?', shareId, result.lastID)
        wishlist.items = []
        const user = await db.get('SELECT * FROM users WHERE id = ?', authenticatedUserId)
        wishlist.createdBy = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          photoUrl: user.photoUrl,
        }
        return reply.send(wishlist)
      }

      wishlist.createdBy = JSON.parse(wishlist.createdBy)

      // The rest of the logic remains the same as the shared route
      const items = await db.all(
        `SELECT
           i.id, i.text, i.links, i.photos, i.createdAt, i.updatedAt, i.createdBy, i.reservedAt,
           CASE WHEN i.reservedBy IS NOT NULL THEN json_object('id', u.id, 'firstName', u.firstName, 'lastName', u.lastName, 'username', u.username, 'photoUrl', u.photoUrl) ELSE NULL END as reservedBy
         FROM items i
         LEFT JOIN users u ON i.reservedBy = u.id
         WHERE i.wishlistId = ?`,
        wishlist.id,
      )

      wishlist.items = items.map((item) => {
        const { reservedBy, ...rest } = item
        return {
          ...rest,
          links: item.links ? JSON.parse(item.links) : [],
          photos: item.photos ? JSON.parse(item.photos) : [],
          reservedBy: reservedBy ? JSON.parse(reservedBy) : null,
        }
      })

      reply.send(wishlist)
    }
    catch (error) {
      app.log.error(error)
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })

  app.get('/:shareId', async (request, reply) => {
    try {
      const { shareId } = request.params
      const authenticatedUserId = request.user.id

      const wishlist = await getWishlist(db, shareId, authenticatedUserId)

      if (!wishlist) {
        return reply.code(404).send({ error: 'Wishlist not found' })
      }

      reply.send(wishlist)
    }
    catch (error) {
      app.log.error(error)
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })

  app.post('/items', async (request, reply) => {
    try {
      const authenticatedUserId = request.user.id
      let { items: incomingItems } = request.body

      if (!Array.isArray(incomingItems)) {
        return reply.code(400).send({ error: 'Items must be an array.' })
      }

      // Filter out empty items before processing
      incomingItems = incomingItems.filter(
        item => item.text
          || (item.links && item.links.length > 0)
          || (item.photos && item.photos.length > 0),
      )

      const wishlist = await db.get('SELECT id FROM wishlists WHERE createdBy = ?', authenticatedUserId)
      if (!wishlist) {
        return reply.code(403).send({ error: 'You can only edit your own wishlist.' })
      }

      const existingItems = await db.all('SELECT id FROM items WHERE wishlistId = ?', wishlist.id)
      const existingItemIds = new Set(existingItems.map(i => i.id))
      const incomingItemIds = new Set(incomingItems.map(i => i.id).filter(Boolean))

      await db.exec('BEGIN')

      // Delete items that are not in the incoming list
      const idsToDelete = [...existingItemIds].filter(id => !incomingItemIds.has(id))
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(',')
        await db.run(`DELETE FROM items WHERE id IN (${placeholders}) AND wishlistId = ?`, ...idsToDelete, wishlist.id)
      }

      for (const item of incomingItems) {
        const links = JSON.stringify(item.links || [])
        const photos = JSON.stringify(item.photos || [])

        if (item.id && existingItemIds.has(item.id)) {
          // Update existing item
          await db.run(
            'UPDATE items SET text = ?, links = ?, photos = ?, updatedAt = ? WHERE id = ? AND wishlistId = ?',
            item.text,
            links,
            photos,
            new Date().toISOString(),
            item.id,
            wishlist.id,
          )
        }
        else if (!item.id) {
          // Create new item
          const now = new Date().toISOString()
          await db.run(
            'INSERT INTO items (text, links, photos, wishlistId, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            item.text,
            links,
            photos,
            wishlist.id,
            authenticatedUserId,
            now,
            now,
          )
        }
      }

      await db.run('UPDATE wishlists SET updatedAt = ? WHERE id = ?', new Date().toISOString(), wishlist.id)
      await db.exec('COMMIT')

      const { shareId } = await db.get('SELECT shareId FROM wishlists WHERE id = ?', wishlist.id)
      await broadcast(shareId, app, db, request.user)

      reply.send({ success: true })
    }
    catch (error) {
      await db.exec('ROLLBACK')
      app.log.error(error)
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })

  app.post('/items/reserve/:itemId', async (request, reply) => {
    try {
      const { itemId } = request.params
      const authenticatedUserId = request.user.id

      const item = await db.get('SELECT * FROM items WHERE id = ?', itemId)
      if (!item) {
        return reply.code(404).send({ error: 'Item not found.' })
      }

      const wishlist = await db.get('SELECT createdBy FROM wishlists WHERE id = ?', item.wishlistId)
      if (wishlist.createdBy === authenticatedUserId) {
        return reply.code(403).send({ error: 'You cannot reserve items from your own wishlist.' })
      }

      if (item.reservedBy) {
        if (item.reservedBy === authenticatedUserId) {
          return reply.send({ success: true, message: 'You have already reserved this item.' })
        }
        else {
          return reply.code(409).send({ error: 'This item is already reserved by someone else.' })
        }
      }

      await db.run(
        'UPDATE items SET reservedBy = ?, reservedAt = ? WHERE id = ?',
        authenticatedUserId,
        new Date().toISOString(),
        itemId,
      )

      const { shareId } = await db.get('SELECT w.shareId FROM wishlists w JOIN items i ON w.id = i.wishlistId WHERE i.id = ?', itemId)
      await broadcast(shareId, app, db, request.user)

      reply.send({ success: true })
    }
    catch (error) {
      app.log.error(error)
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })

  app.post('/items/reserve/cancel/:itemId', async (request, reply) => {
    try {
      const { itemId } = request.params
      const authenticatedUserId = request.user.id

      const item = await db.get('SELECT * FROM items WHERE id = ?', itemId)
      if (!item) {
        return reply.code(404).send({ error: 'Item not found.' })
      }

      const wishlist = await db.get('SELECT createdBy FROM wishlists WHERE id = ?', item.wishlistId)
      if (wishlist.createdBy === authenticatedUserId) {
        return reply.code(403).send({ error: 'You cannot manage reservations for your own wishlist.' })
      }

      if (!item.reservedBy) {
        return reply.code(409).send({ error: 'This item is not currently reserved.' })
      }

      if (item.reservedBy !== authenticatedUserId) {
        return reply.code(403).send({ error: 'You can only cancel your own reservation.' })
      }

      await db.run(
        'UPDATE items SET reservedBy = NULL, reservedAt = NULL WHERE id = ?',
        itemId,
      )

      const { shareId } = await db.get('SELECT w.shareId FROM wishlists w JOIN items i ON w.id = i.wishlistId WHERE i.id = ?', itemId)
      await broadcast(shareId, app, db, request.user)

      reply.send({ success: true })
    }
    catch (error) {
      app.log.error(error)
      reply.code(500).send({ error: 'Internal Server Error' })
    }
  })
}
