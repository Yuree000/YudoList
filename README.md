# YudoList

> You Do, You List — A structured to-do list built for speed and clarity.

YudoList is a full-stack web application designed around keyboard-first workflows. It feels like a text editor but organizes your work. No friction, no clutter.

---

## Features

- **Keyboard-native**: Enter to create, Tab/Shift+Tab to indent, Backspace to delete empty rows
- **Drag to reorder**: Smooth drag-and-drop with visual placeholder feedback
- **Headings**: Type `/h` + Enter to create a section heading
- **Auto-sink completed items**: Finished tasks move to the bottom automatically with animation
- **Calendar view**: Filter items by date; plan future work and review past tasks
- **Full-text search**: Ctrl+K to focus, live filtering as you type
- **Bulk select & delete**: Multi-select mode with one-click bulk delete
- **Undo / Redo**: Full command-pattern undo history (Ctrl+Z / Ctrl+Shift+Z)
- **Dark mode**: Follow system, force light, or force dark — smooth CSS transition
- **Optimistic updates**: Every action feels instant; sync happens silently in the background
- **Category labels**: Tag items as 学习 / 生活 / 工作 (Study / Life / Work)
- **Deadlines & time slots**: Set due dates and start/end times per item
- **Recurring events**: Create repeating tasks across multiple dates at once
- **14-day activity chart**: Visual bar chart of your completion history
- **AI natural language parser**: Describe your plans in plain text; AI creates, completes, or deletes tasks automatically (powered by Kimi / Moonshot)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Animation | Framer Motion |
| Drag & Drop | @dnd-kit |
| State | Zustand |
| Backend | Fastify 5, TypeScript |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + bcrypt |
| AI | Kimi (Moonshot) API — function calling |

---

## Quick Start (Development)

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Moonshot API key](https://platform.moonshot.cn/) for the AI feature (optional)

### Backend

```bash
cd backend
npm install
cp .env.example .env        # fill in JWT_SECRET and optionally MOONSHOT_API_KEY
npm run db:generate
npm run db:push
npm run dev                 # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

---

## Production (Docker)

```bash
# 1. Create a .env file with your secrets
cp .env.example .env

# 2. Build and start all services
docker compose up -d --build

# App is available at http://localhost:80
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Prisma database URL | ✅ |
| `JWT_SECRET` | Secret key for signing JWT tokens | ✅ |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) | ✅ |
| `PORT` | Backend port (default: `3001`) | ✅ |
| `CORS_ORIGIN` | Allowed frontend origin | ✅ |
| `MOONSHOT_API_KEY` | Kimi API key for AI natural language parsing | Optional |

> Without `MOONSHOT_API_KEY` the app works fully — only the AI panel will return an error.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Create item below current |
| Tab | Indent (max level 4) |
| Shift + Tab | Outdent |
| Backspace (empty row) | Delete item |
| `/h` + Enter | Convert to heading |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Focus search bar |

---

## Project Structure

```
yudolist/
├── backend/          # Fastify API server
│   ├── prisma/       # Schema + migrations
│   └── src/
│       ├── routes/   # items, auth, ai
│       ├── schemas/  # Request validation
│       └── lib/      # Utilities, auth middleware
├── frontend/         # React SPA
│   └── src/
│       ├── components/
│       ├── stores/   # Zustand state
│       └── lib/      # Utilities
├── packages/
│   └── shared/       # Shared TypeScript types
└── docker-compose.yml
```

---

## License

MIT
