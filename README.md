# Nexora

Nexora is a Linear-inspired Agile sprint and Kanban workspace for software teams. It pairs a fast, keyboard-first React interface with a Django REST Framework API, JWT authentication, and a seeded PostgreSQL/SQLite data layer.

**Phase 2 (this release):** the frontend is wired to the Django API. Demo login, sprint boards, issue creation and editing, drag-and-drop moves, comments, activity logs, filters, and the command palette all run against the backend. The original local mock API remains as an offline fallback.

## Highlights

- **One-click recruiter demo** — isolated sandbox, reset on every demo login; 20 issues across three sprints.
- **Kanban board with @dnd-kit** — optimistic drag-and-drop across `Backlog`, `Todo`, `In Progress`, `In Review`, and `Done`, reconciled with the server.
- **Atomic task moves** — row-locked, transactional reordering with contiguous positions in both source and destination columns.
- **Issue detail drawer** — inline editing for title, description, status, priority, assignee, labels, and story points, plus comments and automatically logged activity.
- **JWT auth** — access/refresh tokens, automatic refresh on `401`, and a secure demo account.
- **Optimized board reads** — `select_related`/`prefetch_related` keeps the board endpoint bounded to a small number of queries (asserted in tests).
- **Graceful degradation** — if the API is unreachable, the UI falls back to the seeded browser sandbox instead of breaking.
- **Dark-first design system** — Tailwind tokens, subtle borders, Inter/Geist typography, and a working theme toggle.

## Repository structure

```text
Nexora/
├── backend/
│   ├── nexora_core/          # settings, root URLs, WSGI/ASGI
│   ├── boards/
│   │   ├── management/commands/seed_nexora.py
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── models.py         # Workspace, Sprint, Column, Task, ActivityComment
│   │   ├── serializers.py
│   │   ├── services.py       # issue keys, workspace bootstrap, atomic moves, logs
│   │   ├── seed.py           # team + demo workspace data
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── .env.example
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/       # auth, board, command palette, issue drawer, layout, ui
│       ├── lib/              # design tokens, helpers, task ordering/filtering
│       ├── pages/            # login and workspace screens
│       ├── services/
│       │   ├── api.ts        # remote API facade + response mapping
│       │   ├── http.ts       # JWT fetch client, refresh, typed errors
│       │   ├── mockApi.ts    # offline fallback
│       │   └── mockData.ts
│       ├── store/            # zustand stores (auth, board, UI)
│       └── types/            # shared domain interfaces
└── README.md
```

## Getting started

**Requirements:** Python 3.11+ and Node.js 18+.

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Optional: copy .env.example to .env and adjust values.
# SQLite is used automatically when DATABASE_URL is not set.
python manage.py migrate
python manage.py seed_nexora
python manage.py runserver 127.0.0.1:8000
```

The API is served at `http://localhost:8000/api`.

To use PostgreSQL instead, set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgres://nexora:nexora@localhost:5432/nexora
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The frontend uses `http://localhost:8000/api` by default. Override it with `VITE_API_BASE_URL` if the API runs elsewhere.

### Demo login

Click **One-Click Demo Login** on the sign-in screen. Manual credentials:

```text
Email:    demo@nexora.dev
Password: nexora-demo
```

The demo endpoint resets the `recruiter-demo` workspace on every call, so the sandbox is always in a known state.

### Useful commands

| Location | Command | Description |
| --- | --- | --- |
| `backend/` | `python manage.py test boards` | Run the API test suite |
| `backend/` | `python manage.py seed_nexora` | Rebuild the demo workspace |
| `frontend/` | `npm run dev` | Start the Vite dev server |
| `frontend/` | `npm run typecheck` | Type-check with zero-error enforcement |
| `frontend/` | `npm run build` | Type-check and create a production build |
| `frontend/` | `npm run preview` | Preview the production build |

## API

All endpoints are prefixed with `/api`. Authenticated requests send:

```http
Authorization: Bearer <access-token>
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login/` | Log in with `email` (or `username`) and `password`; returns access/refresh tokens |
| `POST` | `/api/auth/refresh/` | Exchange a refresh token for a new access token |
| `POST` | `/api/auth/demo-login/` | Create/reset the recruiter sandbox and return tokens |
| `GET` | `/api/workspaces/current/board/?sprint=<id>` | Optimized board payload for the current workspace |
| `POST` | `/api/tasks/` | Create an issue |
| `PATCH` | `/api/tasks/<id>/` | Update an issue (`title`, `description`, `priority`, `story_points`, `assignee_id`, `label`, `column`) |
| `POST` | `/api/tasks/<id>/move/` | Atomically move an issue: `{ "target_column_id": 2, "new_position": 0 }` |
| `GET` | `/api/tasks/<id>/comments/` | List comments and system activity for an issue |
| `POST` | `/api/tasks/<id>/comments/` | Add a comment: `{ "content": "..." }` |

The board response includes the workspace, active sprint, all sprints, ordered columns with nested tasks, a flattened task list, members, labels, and sprint stats (`total_tasks`, `completed_tasks`, story points, completion percentage). System activity is returned alongside comments and flagged with `is_system_log`.

### Authentication flow

1. `POST /api/auth/demo-login/` (or `/api/auth/login/`) returns `access`, `refresh`, and the current user.
2. The frontend stores tokens in `localStorage` and sends the access token with every request.
3. On a `401`, `frontend/src/services/http.ts` refreshes once, retries the request, and clears tokens if the refresh fails.
4. Signing out clears both tokens and the session.

### Offline fallback

The mock API is retained for demo resilience. If login or a board request fails because the backend is unreachable (connection error, timeout, or `5xx`), the frontend switches to the seeded localStorage sandbox. Mutations then operate on that sandbox until the user signs in again. A reachable backend always takes precedence.

## Data model

- **Workspace** — owner, name, slug, demo-sandbox flag.
- **Sprint** — workspace, name, status (`planned` / `active` / `completed`), dates.
- **Column** — sprint, title, slug, position; unique per sprint.
- **Task** — issue key (for example `NEX-112`), title, description, priority, label, story points, assignee, column, position, timestamps.
- **ActivityComment** — task, author, content, `is_system_log`, created timestamp. Issue creation, priority changes, and column moves are recorded automatically.

Task moves run inside `transaction.atomic()` with row locks. Positions are clamped and renumbered to stay contiguous in both columns. Issue keys are generated per workspace.

## Tests

The backend covers JWT login, demo auth, board shape/ordering, query-count regression, sprint filtering, atomic moves, system activity logs, issue creation, and comments:

```bash
cd backend
python manage.py test boards
```

The frontend is verified with `npm run typecheck` and `npm run build`.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, `@dnd-kit`, `cmdk`, `zustand`, `framer-motion`, `lucide-react`.

**Backend:** Django 5, Django REST Framework, SimpleJWT, django-cors-headers, django-filter, psycopg2, python-dotenv.

## Roadmap

- [x] **Phase 1** — Frontend application, mock data layer, demo experience
- [x] **Phase 2** — Django REST Framework backend, JWT authentication, board/CRUD/move/comment APIs, frontend integration
- [ ] **Phase 3** — Realtime collaboration, notifications, analytics, and deployment
