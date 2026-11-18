# Nexora

Nexora is a production-grade, Linear-inspired Agile sprint and Kanban workspace for software teams. It pairs a fast, keyboard-first interface with a clean service layer designed to plug into a Django REST Framework backend in Phase 2.

**Phase 1 (this release):** a fully interactive frontend — recruiter demo login, a seeded Sprint 14 workspace, a five-column drag-and-drop board, issue detail drawer, comments and activity, global command palette, and dark/light theming — backed by a realistic local mock API.

## Highlights

- **One-click recruiter demo** — no signup; opens *Nexora Core Engineering — Sprint 14* fully seeded with engineering issues.
- **Kanban board with @dnd-kit** — reorder within a column or drag across `Backlog`, `Todo`, `In Progress`, `In Review`, and `Done` with optimistic 0 ms updates and rollback on failure.
- **Issue detail drawer** — inline title/description editing, status, priority, assignee, labels, story points, activity log, and comments.
- **Command palette** — `⌘K` / `Ctrl+K` to jump to issues, create one, filter by priority, toggle theme, or sign out.
- **Filters and search** — real-time text search plus multi-select priority, assignee, and label filters.
- **Dark-first design system** — Tailwind tokens, 1 px subtle borders, Inter/Geist typography, and a working theme toggle.
- **Responsive** — collapsible desktop sidebar, mobile navigation drawer, horizontally scrollable board.

## Repository structure

```
Nexora/
├── frontend/            # React 18 + TypeScript + Vite application
│   ├── public/
│   └── src/
│       ├── components/  # auth, board, command palette, issue drawer, layout, ui
│       ├── lib/         # design tokens, helpers, task ordering/filtering
│       ├── pages/       # login and workspace screens
│       ├── services/    # api.ts (mock now, DRF in Phase 2) + seed data
│       ├── store/       # zustand stores (auth, board, UI)
│       └── types/       # shared domain interfaces
├── backend/             # Placeholder — Django REST Framework (Phase 2)
└── README.md
```

## Getting started

**Requirements:** Node.js 18+ and npm 9+.

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Try it immediately

Click **One-Click Demo Login (Recruiter Sandbox)** on the sign-in screen. The sandbox loads the seeded *Nexora Core Engineering — Sprint 14* workspace with 12 engineering issues, seven teammates, labels, story points, activity, and comments.

Email/password sign-in also works in the sandbox with any valid email and a password of six or more characters.

### Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and create a production build |
| `npm run typecheck` | Run TypeScript with zero-error enforcement |
| `npm run preview` | Preview the production build |

## Demo workspace

- **Workspace:** Nexora Core Engineering
- **Sprints:** Sprint 14 (Active), Sprint 13 (Completed), Backlog
- **Board:** Backlog, Todo, In Progress, In Review, Done
- **Seed data:** 12 active-sprint issues with realistic titles, descriptions, priorities, story points, assignees, labels, activity, and comments

State changes are persisted in your browser's `localStorage`, so the board survives refreshes. To reset the sandbox, clear the `nexora.db.v1` and `nexora.session.v1` keys (or all site data) and reload.

## API abstraction

Every read and mutation goes through `frontend/src/services/api.ts`:

```ts
demoLogin()                  // POST /api/v1/auth/demo-login/
login(email, password)       // POST /api/v1/auth/login/
getBoardData(sprintId?)      // GET  /api/v1/workspaces/:id/board/
createTask(input)            // POST /api/v1/issues/
updateTask(id, patch)        // PATCH /api/v1/issues/:id/
moveTask({ taskId, toStatus, toIndex }) // POST /api/v1/issues/:id/move/
addComment(taskId, body)     // POST /api/v1/issues/:id/comments/
```

The shared interfaces in `frontend/src/types/index.ts` (`Workspace`, `Sprint`, `Column`, `Task`, `User`, `Comment`, plus filter and mutation inputs) are written to map directly to DRF serializers. In Phase 2 only the function bodies change; UI and state code stay untouched.

## Tech stack

- React 18, TypeScript, Vite
- Tailwind CSS (CSS-variable theme tokens, dark mode by default)
- `@dnd-kit` for accessible multi-column drag and drop
- `cmdk` for the global command palette
- `zustand` for client state and optimistic mutations
- `framer-motion` for drawers, modals, and micro-interactions
- `lucide-react` for icons

## Roadmap

- [x] **Phase 1** — Frontend application, mock data layer, demo experience
- [ ] **Phase 2** — Django REST Framework backend, authentication, CRUD and board APIs
- [ ] **Phase 3** — Realtime collaboration, notifications, analytics, and deployment

## Notes

This repository is the Phase 1 hand-off. The `backend/` directory is intentionally empty and reserved for the Phase 2 Django REST Framework service.
