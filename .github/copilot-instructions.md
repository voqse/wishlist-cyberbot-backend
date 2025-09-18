# Wishlist Cyberbot Backend

This is a Telegram Mini App backend built with Node.js, Fastify, SQLite, and the Telegram Bot API. The application provides a wishlist management system with JWT authentication, WebSocket support, and a Telegram bot interface.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Quick Start - Essential Commands

Bootstrap and run the application:
- `yarn install` -- installs dependencies in ~4 seconds. NEVER CANCEL.
- Create `.env.local` from `.env.example` with test values (see Environment Setup below)
- `yarn start` -- starts the application in <1 second after database setup. NEVER CANCEL.
- `yarn lint` -- runs ESLint in ~4 seconds. ALWAYS run before committing.
- `yarn lint:fix` -- automatically fixes linting issues.

## Environment Setup

**CRITICAL**: Always create `.env.local` from `.env.example` before running the application:

```bash
cp .env.example .env.local
```

Fill in test values:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz1234567890
JWT_SECRET=this_is_a_very_long_and_super_secret_key_for_testing_purposes_only
API_PREFIX=/api/v1
```

Note: The Telegram bot will fail to connect with fake tokens, but this is expected and does not prevent the API from working.

## Database Setup

The application uses SQLite with automatic database creation and migrations:
- Database file: `wishlist.db` (created automatically)
- Initial tables are created first, then migrations add additional columns
- **DO NOT** manually create or modify the database - the application handles this
- If database issues occur, delete `wishlist.db` and restart the application

## Manual Validation - Required After Changes

**ALWAYS perform these validation steps after making any code changes:**

### 1. Basic Application Startup
```bash
yarn install
yarn start
```
Verify output shows:
- "Database setup complete."
- "Server listening at http://127.0.0.1:3000"
- "Failed to launch Telegram bot." (expected with test token)

### 2. API Authentication Flow
Generate test authentication data:
```bash
yarn generate-init-data
```

Test authentication endpoint:
```bash
curl -s "http://127.0.0.1:3000/api/v1/auth/telegram" \
  -X POST -H "Content-Type: application/json" \
  -d '{"initData":"GENERATED_INIT_DATA_HERE"}' | python3 -m json.tool
```

Expected response: User object with JWT token.

### 3. Protected Endpoint Test
Using the JWT token from authentication:
```bash
curl -s "http://127.0.0.1:3000/api/v1/wishlist" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | python3 -m json.tool
```

Expected response: Wishlist object with empty items array.

### 4. Complete End-to-End Scenario
Run this one-liner to test the full flow:
```bash
TOKEN=$(curl -s "http://127.0.0.1:3000/api/v1/auth/telegram" -X POST -H "Content-Type: application/json" -d "{\"initData\":\"$(yarn generate-init-data 2>/dev/null | tail -1)\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
curl -s "http://127.0.0.1:3000/api/v1/wishlist" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## Key Directories and Files

- `index.js` - Main application entry point, Fastify server setup
- `database.js` - SQLite database setup and migrations
- `bot.js` - Telegram bot initialization and commands
- `auth.js` / `auth-utils.js` - Telegram authentication validation
- `routes/` - API route definitions
  - `routes/auth.js` - Authentication endpoints
  - `routes/wishlist.js` - Wishlist and WebSocket endpoints
- `migrations/` - Database schema migrations
- `scripts/` - Utility scripts
  - `scripts/generate-init-data.js` - Generate test Telegram auth data
  - `scripts/mock-user.json` - Mock user data for testing
- `.env.example` - Environment variables template

## Development Workflow

1. **Always start with environment setup** - Copy `.env.example` to `.env.local`
2. **Run lint before changes** - `yarn lint` to see current state
3. **Make minimal changes** - This codebase works, avoid unnecessary modifications
4. **Test immediately** - Run the validation scenarios after each change
5. **Lint before committing** - `yarn lint:fix` then `yarn lint` to ensure clean code

## Common Issues and Solutions

### "SQLITE_ERROR: no such table: users"
- Delete `wishlist.db` and restart the application
- Ensure database.js creates tables before running migrations

### "TELEGRAM_BOT_TOKEN not found"
- Check `.env.local` exists and contains the TELEGRAM_BOT_TOKEN value
- The token can be fake for development, but must be present

### "Failed to launch Telegram bot"
- Expected behavior with fake tokens
- The API server will still work correctly

### Linting errors
- Run `yarn lint:fix` to automatically fix most issues
- Manually fix remaining errors before committing

### API returns 401 Unauthorized
- Ensure JWT token is included in Authorization header: `Bearer YOUR_TOKEN`
- Generate fresh token using the authentication endpoint

### Application won't start / Database errors
- Delete `wishlist.db` and restart - database is recreated automatically
- Check `.env.local` exists with all required variables
- Ensure no other process is using port 3000

### Dependencies installation issues
- Use Yarn 4.9.4+ as specified in packageManager
- Clear cache with `yarn cache clean` if needed
- Check Node.js version is v20+

## Repository Structure Overview

```
.
├── .env.example           # Environment variables template
├── .github/
│   └── workflows/
│       └── deploy.yml     # Production deployment workflow
├── auth.js               # Telegram auth validation logic
├── auth-utils.js         # Authentication utility functions
├── bot.js               # Telegram bot setup and commands
├── database.js          # SQLite database initialization
├── eslint.config.ts     # ESLint configuration
├── index.js            # Main application entry point
├── migrations/         # Database schema migrations
├── package.json        # Node.js dependencies and scripts
├── routes/            # API route definitions
└── scripts/           # Utility scripts for development
```

## Timing Expectations (Measured)

- `yarn install`: ~1-4 seconds (very fast with cache)
- `yarn lint`: ~4 seconds
- Application startup: <1 second after database setup
- Database setup: <1 second
- API response time: <100ms for most endpoints

**NEVER CANCEL** any of these operations - they complete quickly.

## Key Environment Requirements

- **Node.js**: v20+ (tested with v20.19.5)
- **Yarn**: v4.9.4+ (package manager specified in packageManager field)
- **SQLite3**: Installed automatically with dependencies
- **Python3**: Required for JSON formatting in validation commands

## Testing Strategy

**No automated tests exist** - all validation must be done manually using the scenarios above.

**CRITICAL**: Always run the complete end-to-end scenario after making changes to ensure the application works correctly. The API must successfully authenticate users and return wishlist data.

## Important Notes

- The application uses ES modules (`"type": "module"` in package.json)
- Telegram bot functionality requires a real bot token in production
- WebSocket support is available at `/api/v1/wishlist/ws` with JWT authentication
- Admin users can access special bot commands (see bot.js)
- Database migrations are applied automatically on startup
