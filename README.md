# Giftlist Backend API Documentation

This document provides a comprehensive overview of the Giftlist backend API, its routes, and the overall workflow.

## Core Concepts

- **Authentication**: User authentication is handled via Telegram Mini App `initData`. A successful authentication yields a JSON Web Token (JWT) which must be used for all subsequent authenticated requests.
- **Wishlists**: Each user has one wishlist. Wishlists can be viewed by their owner or by anyone with a unique, shareable link.
- **Items**: A wishlist consists of multiple items. Items can be added, updated, or deleted by the wishlist owner.
- **Reservations**: Users can reserve items on other users' wishlists. The wishlist owner cannot see if an item has been reserved, but other viewers can.
- **Real-time Updates**: The system uses WebSockets to provide live updates for wishlists, notifying viewers of changes in real-time.

---

## Authentication Workflow

1.  **Get `initData`**: The frontend client obtains the `initData` string from the Telegram Mini App.
2.  **Authenticate**: The client sends this `initData` to the `/auth/telegram` endpoint.
3.  **Receive JWT**: The server validates the data, creates or updates the user in the database, and returns a JWT.
4.  **Authorize Requests**: The client must include this JWT in the `Authorization` header for all future requests to protected endpoints (e.g., `Authorization: Bearer <your_jwt>`).

---

## API Routes

### Authentication

#### `POST /auth/telegram`

Authenticates the user and provides a JWT.

-   **Request Body**:
    ```json
    {
      "initData": "query_id=...&user=...&auth_date=...&hash=..."
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "token": "ey..."
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: If `initData` is not provided.
    -   `401 Unauthorized`: If `initData` is invalid.

### Wishlists & Items

All routes under `/wishlist` (except for the WebSocket endpoint) require a valid JWT.

#### `GET /wishlist`

Fetches the authenticated user's own wishlist. If the user doesn't have one, it will be created automatically.

-   **Details**: The owner **cannot** see any reservation information on their own items.
-   **Success Response (200)**: Returns a `Wishlist` object.

#### `GET /wishlist/:shareId`

Fetches a wishlist using its unique shareable ID.

-   **Details**: This is the public view.
    -   If the viewer is **not** the owner, they will see which items are reserved and by whom.
    -   If the viewer **is** the owner, the response will be the same as `GET /wishlist` (no reservation info).
-   **Success Response (200)**: Returns a `Wishlist` object.
-   **Error Response**:
    -   `404 Not Found`: If no wishlist exists with the given `shareId`.

#### `POST /wishlist/items`

Synchronizes the items for the authenticated user's wishlist. This single endpoint handles adding, updating, and deleting items.

-   **Details**: The server compares the submitted list with the one in the database and applies the differences. All operations are performed in a single, safe transaction.
-   **Request Body**:
    ```json
    {
      "items": [
        { "text": "A new item" },
        { "id": 123, "text": "An updated item" }
      ]
    }
    ```
    *(Note: Items without an `id` are created. Items with an `id` are updated. Items in the database but not in this list are deleted.)*
-   **Success Response (200)**:
    ```json
    { "success": true }
    ```
-   **Side Effect**: Broadcasts an `items_updated` message to all WebSocket clients subscribed to this wishlist.

#### `POST /wishlist/items/:itemId/reserve`

Reserves an item on a wishlist.

-   **Details**:
    -   A user cannot reserve an item on their own wishlist.
    -   An item cannot be reserved if it's already reserved by someone else.
-   **Success Response (200)**:
    ```json
    { "success": true }
    ```
-   **Error Responses**:
    -   `403 Forbidden`: If a user tries to reserve an item on their own list.
    -   `404 Not Found`: If the item does not exist.
    -   `409 Conflict`: If the item is already reserved by another user.
-   **Side Effect**: Broadcasts an `item_reserved` message to all WebSocket clients subscribed to this wishlist.

### WebSockets

#### `GET /wishlist/ws/:shareId`

Establishes a WebSocket connection to receive live updates for a specific wishlist.

-   **Connection**: The client should open a WebSocket connection to `ws://your-server.com/wishlist/ws/<shareId>`.
-   **Messages**: The server will send JSON messages to the client when events occur.
    -   **Items Updated**:
        ```json
        { "type": "items_updated" }
        ```
    -   **Item Reserved**:
        ```json
        { "type": "item_reserved", "itemId": 123 }
        ```
-   **Client Action**: Upon receiving a message, the client should re-fetch the wishlist data using `GET /wishlist/:shareId` to get the latest state.
