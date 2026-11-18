/**
 * Nexora data access layer.
 *
 * Phase 1 runs against a seeded localStorage store so the product works with
 * zero setup. Every function is async and accepts/returns DRF-serializer-shaped
 * types, so Phase 2 only swaps the implementation body for fetch calls:
 *
 *   POST  /api/v1/auth/demo-login/
 *   POST  /api/v1/auth/login/
 *   GET   /api/v1/workspaces/:id/board/?sprint=:sprintId
 *   POST  /api/v1/issues/
 *   PATCH /api/v1/issues/:id/
 *   POST  /api/v1/issues/:id/move/
 *   POST  /api/v1/issues/:id/comments/
 */
import type {
  Activity,
  AuthSession,
  BoardData,
  Comment,
  CreateTaskInput,
  MoveTaskInput,
  Priority,
  Sprint,
  Task,
  TaskStatus,
  UpdateTaskInput,
  User,
} from '../types';
import { PRIORITY_META, STATUS_META, TASK_STATUSES } from '../lib/constants';
import { reorderTaskList } from '../lib/tasks';
import {
  createSeedDatabase,
  DB_VERSION,
  DEMO_USER_ID,
  type MockDatabase,
} from './mockData';

const DB_KEY = 'nexora.db.v1';
const SESSION_KEY = 'nexora.session.v1';
const DEFAULT_LATENCY = 120;

const wait = (ms = DEFAULT_LATENCY): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readDatabase(): MockDatabase {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase;
      if (parsed && parsed.version === DB_VERSION && Array.isArray(parsed.tasks)) {
        return parsed;
      }
    }
  } catch {
    // Corrupt or unavailable storage: fall back to a fresh seed.
  }

  const seeded = createSeedDatabase();
  writeDatabase(seeded);
  return seeded;
}

function writeDatabase(database: MockDatabase): void {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(database));
  } catch {
    // Storage can be unavailable in private browsing; the in-memory session still works.
  }
}

function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures.
  }
}

function currentUser(database: MockDatabase): User {
  const session = readSession();
  const user =
    database.users.find((member) => member.id === session?.user.id) ??
    database.users.find((member) => member.id === DEMO_USER_ID) ??
    database.users[0];
  if (!user) throw new Error('The workspace has no members.');
  return user;
}

function createSession(user: User, workspaceId: string, isDemo: boolean): AuthSession {
  return {
    token: `sandbox_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    user: clone(user),
    workspaceId,
    isDemo,
  };
}

function resolveWorkspace(database: MockDatabase) {
  const workspace = database.workspaces[0];
  if (!workspace) throw new Error('No workspace is available.');
  return workspace;
}

function resolveSprint(database: MockDatabase, sprintId?: string): Sprint {
  const workspace = resolveWorkspace(database);
  const sprints = database.sprints.filter((sprint) => sprint.workspaceId === workspace.id);
  const sprint =
    (sprintId ? sprints.find((item) => item.id === sprintId) : undefined) ??
    sprints.find((item) => item.status === 'active') ??
    sprints[0];
  if (!sprint) throw new Error('No sprint is available.');
  return sprint;
}

const STATUS_INDEX = new Map<TaskStatus, number>(
  TASK_STATUSES.map((status, index) => [status, index]),
);

function sortForBoard(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusDelta =
      (STATUS_INDEX.get(a.status) ?? 0) - (STATUS_INDEX.get(b.status) ?? 0);
    return statusDelta !== 0 ? statusDelta : a.order - b.order;
  });
}

function makeActivity(
  taskId: string,
  actorUser: User,
  type: Activity['type'],
  message: string,
): Activity {
  return {
    id: `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    actor: clone(actorUser),
    type,
    message,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------- auth

export async function getCurrentSession(): Promise<AuthSession | null> {
  await wait(60);
  return clone(readSession());
}

export async function demoLogin(): Promise<AuthSession> {
  await wait(420);
  const database = readDatabase();
  const workspace = resolveWorkspace(database);
  const demoUser =
    database.users.find((user) => user.id === DEMO_USER_ID) ?? database.users[0];
  if (!demoUser) throw new Error('The demo workspace is missing its owner.');

  const session = createSession(demoUser, workspace.id, true);
  writeSession(session);
  return clone(session);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  await wait(500);
  const normalisedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalisedEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (password.trim().length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const database = readDatabase();
  const workspace = resolveWorkspace(database);
  const demoUser =
    database.users.find((user) => user.id === DEMO_USER_ID) ?? database.users[0];
  if (!demoUser) throw new Error('The workspace is missing its owner.');

  const session = createSession(
    {
      ...demoUser,
      email: normalisedEmail,
    },
    workspace.id,
    false,
  );
  writeSession(session);
  return clone(session);
}

export async function logout(): Promise<void> {
  await wait(80);
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

// --------------------------------------------------------------------- board

export async function getBoardData(sprintId?: string): Promise<BoardData> {
  await wait(180);
  const database = readDatabase();
  const workspace = resolveWorkspace(database);
  const sprint = resolveSprint(database, sprintId);
  const sprints = database.sprints
    .filter((item) => item.workspaceId === workspace.id)
    .sort((a, b) => {
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
      return a.name.localeCompare(b.name);
    });

  const data: BoardData = {
    workspace,
    sprint,
    sprints,
    columns: [...database.columns].sort((a, b) => a.order - b.order),
    tasks: sortForBoard(database.tasks.filter((task) => task.sprintId === sprint.id)),
    members: database.users,
    labels: database.labels,
  };

  return clone(data);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  await wait(140);
  const title = input.title.trim();
  if (!title) throw new Error('An issue title is required.');

  const database = readDatabase();
  const workspace = resolveWorkspace(database);
  const sprint = resolveSprint(database, input.sprintId);
  const author = currentUser(database);
  const nowIso = new Date().toISOString();

  const highestKey = database.tasks.reduce((highest, task) => {
    const match = /^NEX-(\d+)$/.exec(task.key);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 100);

  const status: TaskStatus = input.status ?? 'backlog';
  const order = database.tasks.filter(
    (task) => task.sprintId === sprint.id && task.status === status,
  ).length;

  const taskId = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const task: Task = {
    id: taskId,
    key: `NEX-${highestKey + 1}`,
    workspaceId: workspace.id,
    sprintId: sprint.id,
    title,
    description: input.description?.trim() ?? '',
    status,
    priority: input.priority ?? 'medium',
    storyPoints: Math.max(0, Math.round(input.storyPoints ?? 0)),
    assigneeId: input.assigneeId ?? author.id,
    labelIds: input.labelIds ?? [],
    order,
    createdAt: nowIso,
    updatedAt: nowIso,
    comments: [],
    activity: [makeActivity(taskId, author, 'created', 'created the issue')],
  };

  database.tasks.push(task);
  writeDatabase(database);
  return clone(task);
}

export async function updateTask(taskId: string, patch: UpdateTaskInput): Promise<Task> {
  await wait(110);
  const database = readDatabase();
  const task = database.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error('That issue could not be found.');

  const author = currentUser(database);
  const changes: Activity[] = [];
  const nowIso = new Date().toISOString();

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('An issue title is required.');
    if (title !== task.title) {
      task.title = title;
      changes.push(makeActivity(task.id, author, 'title_changed', 'renamed the issue'));
    }
  }

  if (patch.description !== undefined && patch.description !== task.description) {
    task.description = patch.description;
    changes.push(
      makeActivity(task.id, author, 'description_changed', 'updated the description'),
    );
  }

  if (patch.priority !== undefined && patch.priority !== task.priority) {
    const previousPriority: Priority = task.priority;
    task.priority = patch.priority;
    changes.push(
      makeActivity(
        task.id,
        author,
        'priority_changed',
        `changed priority from ${PRIORITY_META[previousPriority].label} to ${PRIORITY_META[patch.priority].label}`,
      ),
    );
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== task.assigneeId) {
    const assignee = patch.assigneeId
      ? database.users.find((user) => user.id === patch.assigneeId)
      : null;
    if (patch.assigneeId && !assignee) throw new Error('That teammate could not be found.');
    task.assigneeId = patch.assigneeId;
    changes.push(
      makeActivity(
        task.id,
        author,
        'assignee_changed',
        assignee ? `assigned this issue to ${assignee.name}` : 'unassigned this issue',
      ),
    );
  }

  if (patch.labelIds !== undefined) {
    const current = [...task.labelIds].sort().join(',');
    const next = [...patch.labelIds].sort().join(',');
    if (current !== next) {
      task.labelIds = [...patch.labelIds];
      changes.push(makeActivity(task.id, author, 'labels_changed', 'updated the labels'));
    }
  }

  if (patch.storyPoints !== undefined) {
    const points = Math.max(0, Math.round(patch.storyPoints));
    if (points !== task.storyPoints) {
      const previousPoints = task.storyPoints;
      task.storyPoints = points;
      changes.push(
        makeActivity(
          task.id,
          author,
          'points_changed',
          `changed story points from ${previousPoints} to ${points}`,
        ),
      );
    }
  }

  let finalTask = task;

  if (patch.status !== undefined && patch.status !== task.status) {
    const previousStatus = task.status;
    database.tasks = reorderTaskList(
      database.tasks,
      task.id,
      patch.status,
      Number.MAX_SAFE_INTEGER,
    );
    const moved = database.tasks.find((item) => item.id === task.id);
    if (!moved) throw new Error('That issue could not be moved.');

    changes.push(
      makeActivity(
        moved.id,
        author,
        'status_changed',
        `moved this issue from ${STATUS_META[previousStatus].label} to ${STATUS_META[patch.status].label}`,
      ),
    );
    finalTask = moved;
  }

  finalTask.updatedAt = nowIso;
  finalTask.activity = [...finalTask.activity, ...changes];
  writeDatabase(database);
  return clone(finalTask);
}

export async function moveTask(input: MoveTaskInput): Promise<Task[]> {
  await wait(90);
  const database = readDatabase();
  const task = database.tasks.find((item) => item.id === input.taskId);
  if (!task) throw new Error('That issue could not be found.');

  const previousStatus = task.status;
  database.tasks = reorderTaskList(
    database.tasks,
    input.taskId,
    input.toStatus,
    input.toIndex,
  );

  const moved = database.tasks.find((item) => item.id === input.taskId);
  if (!moved) throw new Error('That issue could not be moved.');

  moved.updatedAt = new Date().toISOString();
  if (previousStatus !== input.toStatus) {
    const author = currentUser(database);
    moved.activity = [
      ...moved.activity,
      makeActivity(
        moved.id,
        author,
        'status_changed',
        `moved this issue from ${STATUS_META[previousStatus].label} to ${STATUS_META[input.toStatus].label}`,
      ),
    ];
  }

  writeDatabase(database);
  return clone(
    sortForBoard(database.tasks.filter((item) => item.sprintId === moved.sprintId)),
  );
}

// ------------------------------------------------------------------ comments

export async function addComment(taskId: string, body: string): Promise<Comment> {
  await wait(130);
  const text = body.trim();
  if (!text) throw new Error('A comment cannot be empty.');

  const database = readDatabase();
  const task = database.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error('That issue could not be found.');

  const comment: Comment = {
    id: `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    author: clone(currentUser(database)),
    body: text,
    createdAt: new Date().toISOString(),
  };

  task.comments.push(comment);
  task.updatedAt = comment.createdAt;
  writeDatabase(database);
  return clone(comment);
}
