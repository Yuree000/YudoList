# YudoList

YudoList is a keyboard-first full-stack todo app built with React, Fastify, Prisma, and SQLite.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4
- Backend: Fastify 5, TypeScript, Prisma
- Database: SQLite
- Auth: JWT
- AI: Moonshot / Kimi (optional)

## Startup

The repository now keeps one startup path only:

- Start: `start.bat`
- Stop: `stop.bat`

`start.bat` will:

1. Create `backend/.env` from `backend/.env.example` if needed
2. Install backend and frontend dependencies if `node_modules` is missing
3. Run Prisma client generation and `prisma db push`
4. Start backend and frontend in the background
5. Open [http://localhost:3000](http://localhost:3000)

If the browser does not open automatically, open [http://localhost:3000](http://localhost:3000) manually.

## Requirements

- Windows
- Node.js 18+
- npm 9+

## Backend Environment

Edit `backend/.env.example` and keep real secrets only in your local `backend/.env`.

Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `MOONSHOT_API_KEY`

## AI Configuration

AI is optional.

- If `MOONSHOT_API_KEY` is empty, the rest of the app still works
- Put your real key only in local `backend/.env`
- Do not commit `backend/.env`
- Commit `backend/.env.example` with an empty value instead

## Troubleshooting

- If startup state looks wrong, run `stop.bat` first, then `start.bat`
- Backend health check: [http://localhost:3001/health](http://localhost:3001/health)
- If AI fails, check whether `MOONSHOT_API_KEY` is set in local `backend/.env`

## License

MIT
