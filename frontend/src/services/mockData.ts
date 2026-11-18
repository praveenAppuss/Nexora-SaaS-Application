import type {
  Activity,
  ActivityType,
  Column,
  Comment,
  Label,
  Priority,
  Sprint,
  Task,
  TaskStatus,
  User,
  Workspace,
} from '../types';

export const DB_VERSION = 1;
export const DEMO_USER_ID = 'usr_alex';

export interface MockDatabase {
  version: number;
  workspaces: Workspace[];
  sprints: Sprint[];
  columns: Column[];
  users: User[];
  labels: Label[];
  tasks: Task[];
}

interface SeedComment {
  authorId: string;
  body: string;
  daysAgo?: number;
  hoursAgo?: number;
}

interface SeedActivity {
  actorId: string;
  type: ActivityType;
  message: string;
  daysAgo?: number;
  hoursAgo?: number;
}

interface SeedTask {
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  storyPoints: number;
  assigneeId: string | null;
  labelIds: string[];
  sprintId: string;
  order: number;
  createdById?: string;
  createdDaysAgo: number;
  createdHoursAgo?: number;
  comments?: SeedComment[];
  activities?: SeedActivity[];
}

export function createSeedDatabase(): MockDatabase {
  const now = Date.now();
  const isoAgo = (days = 0, hours = 0): string =>
    new Date(now - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
  const dateOffset = (days: number): string => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const users: User[] = [
    {
      id: DEMO_USER_ID,
      name: 'Alex Chen',
      email: 'alex@nexora.dev',
      role: 'Senior Software Engineer',
      avatarColor: 'indigo',
      initials: 'AC',
    },
    {
      id: 'usr_priya',
      name: 'Priya Sharma',
      email: 'priya@nexora.dev',
      role: 'Frontend Engineer',
      avatarColor: 'pink',
      initials: 'PS',
    },
    {
      id: 'usr_marcus',
      name: 'Marcus Johnson',
      email: 'marcus@nexora.dev',
      role: 'Backend Engineer',
      avatarColor: 'emerald',
      initials: 'MJ',
    },
    {
      id: 'usr_sofia',
      name: 'Sofia Rossi',
      email: 'sofia@nexora.dev',
      role: 'Product Designer',
      avatarColor: 'amber',
      initials: 'SR',
    },
    {
      id: 'usr_daniel',
      name: 'Daniel Kim',
      email: 'daniel@nexora.dev',
      role: 'Engineering Manager',
      avatarColor: 'sky',
      initials: 'DK',
    },
    {
      id: 'usr_lena',
      name: 'Lena Fischer',
      email: 'lena@nexora.dev',
      role: 'QA Engineer',
      avatarColor: 'violet',
      initials: 'LF',
    },
    {
      id: 'usr_tomas',
      name: 'Tomás Silva',
      email: 'tomas@nexora.dev',
      role: 'Platform Engineer',
      avatarColor: 'rose',
      initials: 'TS',
    },
  ];
  const userById = new Map(users.map((user) => [user.id, user]));
  const actor = (id: string): User => {
    const user = userById.get(id);
    if (!user) throw new Error(`Seed data references unknown user: ${id}`);
    return user;
  };

  const workspace: Workspace = {
    id: 'ws_nexora_core',
    name: 'Nexora Core Engineering',
    slug: 'nexora-core',
    description: 'Platform, API, and web experience for the Nexora product.',
    memberIds: users.map((user) => user.id),
  };

  const sprints: Sprint[] = [
    {
      id: 'spr_14',
      workspaceId: workspace.id,
      name: 'Sprint 14',
      status: 'active',
      goal: 'Ship the collaborative board MVP and harden realtime sync.',
      startDate: dateOffset(-8),
      endDate: dateOffset(5),
    },
    {
      id: 'spr_13',
      workspaceId: workspace.id,
      name: 'Sprint 13',
      status: 'completed',
      goal: 'Stabilise the issue API and ship the new navigation shell.',
      startDate: dateOffset(-24),
      endDate: dateOffset(-10),
    },
    {
      id: 'spr_backlog',
      workspaceId: workspace.id,
      name: 'Backlog',
      status: 'planned',
      goal: 'Ideas and follow-ups that are not yet scheduled.',
      startDate: null,
      endDate: null,
    },
  ];

  const labels: Label[] = [
    { id: 'lbl_frontend', name: 'Frontend', color: 'blue' },
    { id: 'lbl_backend', name: 'Backend', color: 'emerald' },
    { id: 'lbl_bug', name: 'Bug', color: 'red' },
    { id: 'lbl_api', name: 'API', color: 'violet' },
    { id: 'lbl_uiux', name: 'UI/UX', color: 'amber' },
    { id: 'lbl_infra', name: 'Infrastructure', color: 'sky' },
    { id: 'lbl_perf', name: 'Performance', color: 'lime' },
  ];

  const columns: Column[] = [
    { id: 'backlog', name: 'Backlog', order: 0 },
    { id: 'todo', name: 'Todo', order: 1 },
    { id: 'in_progress', name: 'In Progress', order: 2 },
    { id: 'in_review', name: 'In Review', order: 3 },
    { id: 'done', name: 'Done', order: 4 },
  ];

  let commentSequence = 0;

  const makeComment = (
    taskId: string,
    authorId: string,
    body: string,
    createdAt: string,
  ): Comment => {
    commentSequence += 1;
    return {
      id: `cmt_${taskId}_${commentSequence}`,
      taskId,
      author: actor(authorId),
      body,
      createdAt,
    };
  };

  const makeActivity = (
    taskId: string,
    entryActor: User,
    type: ActivityType,
    message: string,
    createdAt: string,
  ): Activity => ({
    id: `act_${taskId}_${createdAt}_${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    actor: entryActor,
    type,
    message,
    createdAt,
  });

  const makeTask = (seed: SeedTask): Task => {
    const id = `tsk_${seed.key.toLowerCase().replace('-', '_')}`;
    const createdAt = isoAgo(seed.createdDaysAgo, seed.createdHoursAgo);
    const comments = (seed.comments ?? []).map((comment) =>
      makeComment(
        id,
        comment.authorId,
        comment.body,
        isoAgo(comment.daysAgo ?? 0, comment.hoursAgo ?? 0),
      ),
    );
    const activity: Activity[] = [
      makeActivity(
        id,
        actor(seed.createdById ?? DEMO_USER_ID),
        'created',
        'created the issue',
        createdAt,
      ),
      ...(seed.activities ?? []).map((entry) =>
        makeActivity(
          id,
          actor(entry.actorId),
          entry.type,
          entry.message,
          isoAgo(entry.daysAgo ?? 0, entry.hoursAgo ?? 0),
        ),
      ),
    ];
    const timestamps = [...activity.map((entry) => entry.createdAt), ...comments.map((c) => c.createdAt)].sort();
    const updatedAt = timestamps[timestamps.length - 1] ?? createdAt;

    return {
      id,
      key: seed.key,
      workspaceId: workspace.id,
      sprintId: seed.sprintId,
      title: seed.title,
      description: seed.description,
      status: seed.status,
      priority: seed.priority,
      storyPoints: seed.storyPoints,
      assigneeId: seed.assigneeId,
      labelIds: seed.labelIds,
      order: seed.order,
      createdAt,
      updatedAt,
      comments,
      activity,
    };
  };

  const tasks: Task[] = [
    // ---------------------------------------------------------------- Sprint 14
    makeTask({
      key: 'NEX-104',
      title: 'Implement drag-and-drop reordering for the sprint board',
      description:
        'Wire up @dnd-kit across all five board columns so issues can be reordered within a column and moved between columns.\n\n- Persist ordering through the optimistic mutation layer\n- Keep keyboard sorting accessible with a drag handle\n- Render a drop-zone placeholder while dragging over a column\n- Cover cross-column moves in the board integration tests',
      status: 'in_progress',
      priority: 'urgent',
      storyPoints: 8,
      assigneeId: 'usr_priya',
      labelIds: ['lbl_frontend', 'lbl_uiux'],
      sprintId: 'spr_14',
      order: 0,
      createdById: 'usr_daniel',
      createdDaysAgo: 5,
      createdHoursAgo: 3,
      activities: [
        {
          actorId: 'usr_priya',
          type: 'status_changed',
          message: 'moved this issue to In Progress',
          daysAgo: 2,
          hoursAgo: 4,
        },
      ],
      comments: [
        {
          authorId: 'usr_marcus',
          body: 'The API already accepts an ordered issue list — the reorder endpoint is live on staging. Send the full column order so the server can reconcile in one transaction.',
          daysAgo: 1,
          hoursAgo: 6,
        },
        {
          authorId: 'usr_priya',
          body: "Nice. I'm keeping the client-side order as the source of truth until the mutation resolves, then reconciling from the response.",
          hoursAgo: 20,
        },
      ],
    }),
    makeTask({
      key: 'NEX-107',
      title: 'Build the sprint burndown chart endpoint',
      description:
        'Expose daily remaining points for the active sprint so the analytics view can render a burndown line.\n\n- Aggregate completed story points per day from the activity log\n- Return scope changes separately from completed work\n- Cache the response and refresh on a five-minute window',
      status: 'in_review',
      priority: 'medium',
      storyPoints: 5,
      assigneeId: 'usr_marcus',
      labelIds: ['lbl_api', 'lbl_backend'],
      sprintId: 'spr_14',
      order: 0,
      createdById: 'usr_daniel',
      createdDaysAgo: 6,
      activities: [
        {
          actorId: 'usr_marcus',
          type: 'status_changed',
          message: 'moved this issue to In Review',
          daysAgo: 1,
          hoursAgo: 2,
        },
      ],
      comments: [
        {
          authorId: 'usr_daniel',
          body: "Please include the ideal line data on the server — we don't want two implementations drifting apart between web and mobile.",
          daysAgo: 1,
          hoursAgo: 5,
        },
      ],
    }),
    makeTask({
      key: 'NEX-109',
      title: 'Stream activity feed updates over WebSockets',
      description:
        'Push issue activity to connected board clients instead of polling every ten seconds.\n\n- Use Django Channels with a per-workspace group\n- Reconnect with jittered backoff after network loss\n- Deduplicate events using a monotonic sequence number\n- Drop the client to polling when the socket is unavailable',
      status: 'in_progress',
      priority: 'high',
      storyPoints: 5,
      assigneeId: 'usr_tomas',
      labelIds: ['lbl_backend', 'lbl_api'],
      sprintId: 'spr_14',
      order: 1,
      createdById: 'usr_tomas',
      createdDaysAgo: 7,
      activities: [
        {
          actorId: 'usr_tomas',
          type: 'status_changed',
          message: 'moved this issue to In Progress',
          daysAgo: 3,
        },
      ],
      comments: [
        {
          authorId: 'usr_marcus',
          body: 'The token refresh path needs to preserve the socket. I hit a reconnect loop on staging when the access token rotated mid-session.',
          daysAgo: 2,
          hoursAgo: 3,
        },
      ],
    }),
    makeTask({
      key: 'NEX-110',
      title: 'Refine issue drawer transition timings',
      description:
        'The drawer currently feels heavy on slower machines. Tighten the motion and respect reduced-motion preferences.\n\n- Move the panel to a spring that settles under 260ms\n- Fade the backdrop in over 180ms\n- Disable transform animations with prefers-reduced-motion\n- Re-check focus trapping after the transition',
      status: 'in_review',
      priority: 'low',
      storyPoints: 2,
      assigneeId: 'usr_sofia',
      labelIds: ['lbl_uiux', 'lbl_frontend'],
      sprintId: 'spr_14',
      order: 1,
      createdById: 'usr_sofia',
      createdDaysAgo: 4,
      createdHoursAgo: 2,
      activities: [
        {
          actorId: 'usr_sofia',
          type: 'status_changed',
          message: 'moved this issue to In Review',
          daysAgo: 1,
          hoursAgo: 8,
        },
      ],
    }),
    makeTask({
      key: 'NEX-112',
      title: 'Fix stale board state after a failed optimistic mutation',
      description:
        'When a drag mutation fails, the card can stay in the destination column until a full refresh.\n\nSteps to reproduce:\n1. Throttle the network to offline in DevTools\n2. Drag a card from Todo to In Progress\n3. Restore the network and refresh\n\nThe optimistic snapshot must roll back exactly, including column order, and surface a retry action.',
      status: 'todo',
      priority: 'urgent',
      storyPoints: 8,
      assigneeId: DEMO_USER_ID,
      labelIds: ['lbl_bug', 'lbl_frontend'],
      sprintId: 'spr_14',
      order: 0,
      createdById: 'usr_lena',
      createdDaysAgo: 2,
      activities: [
        {
          actorId: 'usr_daniel',
          type: 'priority_changed',
          message: 'changed priority from High to Urgent',
          daysAgo: 1,
          hoursAgo: 4,
        },
      ],
      comments: [
        {
          authorId: 'usr_lena',
          body: 'Reproduced on a throttled connection: moving a card while offline leaves it in the new column until refresh. Returning the previous snapshot only fixes the moved task, not the reordered neighbours.',
          daysAgo: 1,
          hoursAgo: 7,
        },
      ],
    }),
    makeTask({
      key: 'NEX-115',
      title: 'Add role-based permissions to issue mutations',
      description:
        'Only workspace members with the engineer or admin role should be able to create and move issues.\n\n- Add DRF permission classes for issue endpoints\n- Validate sprint membership before accepting a move\n- Return a consistent 403 payload the frontend can render\n- Cover viewer, engineer, and admin roles in tests',
      status: 'todo',
      priority: 'high',
      storyPoints: 5,
      assigneeId: 'usr_marcus',
      labelIds: ['lbl_backend', 'lbl_api'],
      sprintId: 'spr_14',
      order: 1,
      createdById: 'usr_daniel',
      createdDaysAgo: 3,
      createdHoursAgo: 5,
    }),
    makeTask({
      key: 'NEX-118',
      title: 'Add SSO provisioning hooks for enterprise workspaces',
      description:
        'Lay the groundwork for SCIM and Just-in-Time provisioning in enterprise plans.\n\n- Add workspace-level SSO configuration model\n- Expose SCIM user and group endpoints behind a feature flag\n- Map IdP groups to workspace roles\n- Emit audit events for every provisioning change',
      status: 'backlog',
      priority: 'high',
      storyPoints: 8,
      assigneeId: 'usr_marcus',
      labelIds: ['lbl_backend', 'lbl_api'],
      sprintId: 'spr_14',
      order: 0,
      createdById: 'usr_daniel',
      createdDaysAgo: 8,
    }),
    makeTask({
      key: 'NEX-119',
      title: 'Polish keyboard navigation across the command palette',
      description:
        'The palette should be fully usable with the keyboard from the moment it opens.\n\n- Implement a combobox pattern with roving tabindex\n- Announce result counts to screen readers\n- Keep the active item visible while arrowing\n- Add a visible shortcut hint for opening the palette',
      status: 'todo',
      priority: 'medium',
      storyPoints: 3,
      assigneeId: DEMO_USER_ID,
      labelIds: ['lbl_uiux', 'lbl_frontend'],
      sprintId: 'spr_14',
      order: 2,
      createdById: 'usr_sofia',
      createdDaysAgo: 5,
      createdHoursAgo: 6,
    }),
    makeTask({
      key: 'NEX-121',
      title: 'Design empty states for sprint analytics',
      description:
        'New workspaces land on charts with no data and no explanation. Design a first-run state that points people toward creating their first sprint.\n\n- Empty, loading, and error variants for each chart\n- Illustration that works in dark and light themes\n- Copy that explains what will appear once a sprint starts',
      status: 'backlog',
      priority: 'low',
      storyPoints: 3,
      assigneeId: 'usr_sofia',
      labelIds: ['lbl_uiux'],
      sprintId: 'spr_14',
      order: 2,
      createdById: 'usr_sofia',
      createdDaysAgo: 6,
      createdHoursAgo: 4,
    }),
    makeTask({
      key: 'NEX-124',
      title: 'Audit GraphQL query cost for board subscriptions',
      description:
        'Board subscriptions fetch more fields than the UI renders, especially on mobile.\n\n- Measure query cost per board load\n- Trim unused nested issue fields from the subscription\n- Cap subscription payloads during large drag operations\n- Publish a before/after p95 latency report',
      status: 'backlog',
      priority: 'medium',
      storyPoints: 5,
      assigneeId: 'usr_tomas',
      labelIds: ['lbl_backend', 'lbl_perf'],
      sprintId: 'spr_14',
      order: 1,
      createdById: 'usr_tomas',
      createdDaysAgo: 7,
      createdHoursAgo: 2,
    }),
    makeTask({
      key: 'NEX-101',
      title: 'Set up PostgreSQL connection pooling for the API',
      description:
        'The API is exhausting connections under board subscription load. Move PgBouncer in front of PostgreSQL and verify the Django connection lifecycle.\n\n- Use transaction pooling with a 120-connection ceiling\n- Set a sane CONN_MAX_AGE for workers\n- Load test 200 concurrent board subscribers\n- Document the pooling setup in the runbook',
      status: 'done',
      priority: 'high',
      storyPoints: 5,
      assigneeId: 'usr_tomas',
      labelIds: ['lbl_backend', 'lbl_infra'],
      sprintId: 'spr_14',
      order: 0,
      createdById: 'usr_tomas',
      createdDaysAgo: 10,
      activities: [
        {
          actorId: 'usr_tomas',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 3,
          hoursAgo: 3,
        },
      ],
      comments: [
        {
          authorId: 'usr_marcus',
          body: 'Pool saturated at 40 concurrent board subscriptions on staging; 120 looks like the right ceiling. Nice work.',
          daysAgo: 3,
          hoursAgo: 1,
        },
      ],
    }),
    makeTask({
      key: 'NEX-098',
      title: 'Redesign the workspace switcher and sidebar shell',
      description:
        'Rework the sidebar shell to support multiple workspaces without losing vertical space on smaller laptops.\n\n- Collapse to an icon rail below 1280px\n- Add a compact workspace switcher with keyboard access\n- Persist collapse preference per user\n- Match the new 1px border and surface tokens',
      status: 'done',
      priority: 'medium',
      storyPoints: 3,
      assigneeId: 'usr_priya',
      labelIds: ['lbl_uiux', 'lbl_frontend'],
      sprintId: 'spr_14',
      order: 1,
      createdById: 'usr_sofia',
      createdDaysAgo: 9,
      activities: [
        {
          actorId: 'usr_priya',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 4,
          hoursAgo: 6,
        },
      ],
    }),

    // ---------------------------------------------------------------- Sprint 13
    makeTask({
      key: 'NEX-087',
      title: 'Implement cursor pagination for issue lists',
      description:
        'Offset pagination duplicates rows while issues are being reordered. Move the issue list endpoint to opaque cursor pagination.',
      status: 'done',
      priority: 'high',
      storyPoints: 5,
      assigneeId: 'usr_marcus',
      labelIds: ['lbl_backend', 'lbl_api'],
      sprintId: 'spr_13',
      order: 0,
      createdById: 'usr_marcus',
      createdDaysAgo: 26,
      activities: [
        {
          actorId: 'usr_marcus',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 17,
        },
      ],
    }),
    makeTask({
      key: 'NEX-090',
      title: 'Add keyboard shortcut cheatsheet overlay',
      description:
        'A searchable overlay for every board shortcut, opened with the question mark key.',
      status: 'done',
      priority: 'medium',
      storyPoints: 3,
      assigneeId: 'usr_priya',
      labelIds: ['lbl_frontend', 'lbl_uiux'],
      sprintId: 'spr_13',
      order: 1,
      createdById: 'usr_priya',
      createdDaysAgo: 25,
      activities: [
        {
          actorId: 'usr_priya',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 15,
        },
      ],
    }),
    makeTask({
      key: 'NEX-093',
      title: 'Fix WebSocket reconnect storm under high latency',
      description:
        'Reconnect attempts synchronized across clients and hammered the gateway during an incident. Add jitter and a 30-second floor.',
      status: 'done',
      priority: 'urgent',
      storyPoints: 8,
      assigneeId: 'usr_tomas',
      labelIds: ['lbl_bug', 'lbl_backend'],
      sprintId: 'spr_13',
      order: 2,
      createdById: 'usr_lena',
      createdDaysAgo: 24,
      activities: [
        {
          actorId: 'usr_tomas',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 14,
        },
      ],
    }),
    makeTask({
      key: 'NEX-095',
      title: 'Polish onboarding empty states',
      description:
        'Align copy and illustration across the first-run workspace, team, and sprint empty states.',
      status: 'done',
      priority: 'low',
      storyPoints: 2,
      assigneeId: 'usr_sofia',
      labelIds: ['lbl_uiux'],
      sprintId: 'spr_13',
      order: 3,
      createdById: 'usr_sofia',
      createdDaysAgo: 23,
      activities: [
        {
          actorId: 'usr_sofia',
          type: 'status_changed',
          message: 'moved this issue to Done',
          daysAgo: 13,
        },
      ],
    }),

    // ------------------------------------------------------------------ Backlog
    makeTask({
      key: 'NEX-126',
      title: 'Introduce saved views for board filters',
      description:
        'Let teams save a combination of filters and share it with the workspace.\n\n- Persist filter sets per workspace and per user\n- Support default views on workspace open\n- Show saved views in the sidebar with a shortcut key',
      status: 'backlog',
      priority: 'high',
      storyPoints: 5,
      assigneeId: 'usr_priya',
      labelIds: ['lbl_frontend'],
      sprintId: 'spr_backlog',
      order: 0,
      createdById: 'usr_daniel',
      createdDaysAgo: 12,
    }),
    makeTask({
      key: 'NEX-127',
      title: 'Add webhook delivery retries with exponential backoff',
      description:
        'Webhook deliveries currently fail permanently after one non-2xx response. Add retries with visibility into delivery history.',
      status: 'backlog',
      priority: 'medium',
      storyPoints: 3,
      assigneeId: 'usr_marcus',
      labelIds: ['lbl_api', 'lbl_backend'],
      sprintId: 'spr_backlog',
      order: 1,
      createdById: 'usr_marcus',
      createdDaysAgo: 14,
    }),
    makeTask({
      key: 'NEX-128',
      title: 'Explore density modes for the kanban board',
      description:
        'Prototype a compact card mode so teams can fit more work on screen without hiding priority or assignee.',
      status: 'backlog',
      priority: 'low',
      storyPoints: 2,
      assigneeId: 'usr_sofia',
      labelIds: ['lbl_uiux'],
      sprintId: 'spr_backlog',
      order: 2,
      createdById: 'usr_sofia',
      createdDaysAgo: 11,
    }),
    makeTask({
      key: 'NEX-129',
      title: 'Design multi-tenant data isolation strategy',
      description:
        'Document and prototype row-level isolation for enterprise workspaces, including query scoping and audit requirements.',
      status: 'backlog',
      priority: 'urgent',
      storyPoints: 8,
      assigneeId: 'usr_tomas',
      labelIds: ['lbl_backend', 'lbl_infra'],
      sprintId: 'spr_backlog',
      order: 3,
      createdById: 'usr_daniel',
      createdDaysAgo: 16,
    }),
  ];

  return {
    version: DB_VERSION,
    workspaces: [workspace],
    sprints,
    columns,
    users,
    labels,
    tasks,
  };
}
