import authRoutes from './auth.js'
import wishlistRoutes from './wishlist.js'

export default async function (app, options) {
  const { db } = options
  app.register(authRoutes, { prefix: '/auth', db })
  app.register(wishlistRoutes, { prefix: '/wishlist', db })
}
