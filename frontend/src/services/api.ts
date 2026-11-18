/**
 * Nexora data access layer.
 *
 * Every call goes to the Django REST Framework API first. If the backend is
 * unreachable (for example during a frontend-only demo), authentication falls
 * back to the seeded localStorage sandbox so the UI remains fully usable.
 *
 * Remote endpoints:
 *   POST  /api/auth/login/                  JWT login (email or username)
 *   POST  /api/auth/refresh/                JWT refresh
 *   POST  /api/auth/demo-login/             Recruiter sandbox
 *   GET   /api/workspaces/current/board/    Active sprint board
 *   POST  /api/tasks/                       Create issue
 *   PATCH /api/tasks/:id/                   Update issue
 *   POST  /api/tasks/:id/move/              Atomic drag-and-drop move
 *   POST  /api/tasks/:id/comments/          Post a comment
 */
import type {
  Activity,
  ActivityType,
  AuthSession,
  AvatarColor,
  BoardData,
  Comment,
  CreateTaskInput,
  Label,
  MoveTaskInput,
  Priority,
  Sprint,
  SprintStatus,
  Task,
  TaskStatus,
  UpdateTaskInput,
  User,
  Workspace,
} from '../types';
import { isTaskStatus, PRIORITIES } from '../lib/constants';
import { initialsFromName } from '../lib/utils';
import {
  ApiError,
  apiFetch,
  clearTokens,
  getTokens,
  isBackendUnavailable,
  setTokens,
} from './http';
import * as mockApi from './mockApi';

const REMOTE_SESSION_KEY = 'nexora.session.v2';
const LABEL_VALUES = ['Frontend', 'Backend', 'Bug', 'API', 'UI/UX'];

type ApiMode = 'remote' | 'mock';
let apiMode: ApiMode | null = null;
let currentSprintId: string | null = null;
const columnIds = new Map<string, number>();

// --------------------------------------------------------------- API types

interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

interface ApiComment {
  id: number;
  task: number;
  author: ApiUser;
  content: string;
  is_system_log: boolean;
  created_at: string;
}

interface ApiTask {
  id: number;
  issue_key: string;
  title: string;
  description: string;
  column: number;
  column_slug: string;
  sprint_id: number;
  workspace_id: number;
  priority: string;
  label: string;
  story_points: number;
  assignee: ApiUser | null;
  position: number;
  created_at: string;
  updated_at: string;
  comments: ApiComment[];
}

interface ApiColumn {
  id: number;
  title: string;
  slug: string;
  position: number;
  task_count: number;
  story_points: number;
  tasks: ApiTask[];
}

interface ApiSprint {
  id: number;
  workspace: number;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface ApiWorkspace {
  id: number;
  name: string;
  slug: string;
  owner: number;
  is_demo_sandbox: boolean;
  created_at: string;
}

interface ApiLabel {
  id: string;
  name: string;
  color: string;
}

interface ApiBoard {
  workspace: ApiWorkspace;
  sprint: ApiSprint;
  sprints: ApiSprint[];
  columns: ApiColumn[];
  tasks: ApiTask[];
  members: ApiUser[];
  labels: ApiLabel[];
  stats: {
    total_tasks: number;
    completed_tasks: number;
    total_story_points: number;
    completed_story_points: number;
    completion_percentage: number;
  };
}

interface ApiAuthResponse {
  access: string;
  refresh: string;
  token_type: string;
  user: ApiUser;
  workspace_id: number;
  is_demo: boolean;
}

interface ApiMoveResponse {
  task: ApiTask;
  tasks: ApiTask[];
}

// ------------------------------------------------------------------ mapping

const AVATAR_COLORS: AvatarColor[] = [
  'indigo',
  'pink',
  'emerald',
  'amber',
  'sky',
  'violet',
  'rose',
];

const LABEL_COLORS: Record<string, Label['color']> = {
  Frontend: 'blue',
  Backend: 'emerald',
  Bug: 'red',
  API: 'violet',
  'UI/UX': 'amber',
};

function mapUser(user: ApiUser): User {
  const name =
    user.name?.trim() ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username;
  return {
    id: String(user.id),
    name,
    email: user.email,
    role: 'Nexora team member',
    avatarColor: AVATAR_COLORS[Math.abs(user.id) % AVATAR_COLORS.length],
    initials: initialsFromName(name),
  };
}

function mapPriority(value: string): Priority {
  return (PRIORITIES as string[]).includes(value) ? (value as Priority) : 'medium';
}

function mapSprintStatus(value: string): SprintStatus {
  if (value === 'active' || value === 'completed' || value === 'planned') {
    return value;
  }
  return 'planned';
}

function inferActivityType(message: string): ActivityType {
  const text = message.toLowerCase();
  if (text.includes('moved')) return 'status_changed';
  if (text.includes('priority')) return 'priority_changed';
  if (text.includes('assign')) return 'assignee_changed';
  if (text.includes('label')) return 'labels_changed';
  if (text.includes('story points')) return 'points_changed';
  if (text.includes('description')) return 'description_changed';
  if (text.includes('renamed') || text.includes('title')) return 'title_changed';
  return 'updated';
}

function mapComment(comment: ApiComment, taskId: string): Comment {
  return {
    id: String(comment.id),
    taskId,
    author: mapUser(comment.author),
    body: comment.content,
    createdAt: comment.created_at,
  };
}

function mapTask(task: ApiTask): Task {
  const taskId = String(task.id);
  const systemLogs = task.comments.filter((comment) => comment.is_system_log);
  const comments = task.comments.filter((comment) => !comment.is_system_log);

  const activity: Activity[] = systemLogs.map((comment) => ({
    id: `activity-${comment.id}`,
    taskId,
    actor: mapUser(comment.author),
    type: inferActivityType(comment.content),
    message: comment.content,
    createdAt: comment.created_at,
  }));

  return {
    id: taskId,
    key: task.issue_key,
    workspaceId: String(task.workspace_id),
    sprintId: String(task.sprint_id),
    title: task.title,
    description: task.description,
    status: isTaskStatus(task.column_slug) ? task.column_slug : 'backlog',
    priority: mapPriority(task.priority),
    storyPoints: task.story_points,
    assigneeId: task.assignee ? String(task.assignee.id) : null,
    labelIds: task.label ? [task.label] : [],
    order: task.position,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    comments: comments.map((comment) => mapComment(comment, taskId)),
    activity,
  };
}

function mapBoard(payload: ApiBoard): BoardData {
  const workspace: Workspace = {
    id: String(payload.workspace.id),
    name: payload.workspace.name,
    slug: payload.workspace.slug,
    description: 'Nexora engineering workspace.',
    memberIds: payload.members.map((member) => String(member.id)),
  };

  const sprints: Sprint[] = payload.sprints.map((sprint) => ({
    id: String(sprint.id),
    workspaceId: String(sprint.workspace),
    name: sprint.name,
    status: mapSprintStatus(sprint.status),
    goal: '',
    startDate: sprint.start_date,
    endDate: sprint.end_date,
  }));

  const sprint = sprints.find(
    (item) => item.id === String(payload.sprint.id),
  ) ?? {
    id: String(payload.sprint.id),
    workspaceId: String(payload.sprint.workspace),
    name: payload.sprint.name,
    status: mapSprintStatus(payload.sprint.status),
    goal: '',
    startDate: payload.sprint.start_date,
    endDate: payload.sprint.end_date,
  };

  const labels: Label[] = payload.labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: LABEL_COLORS[label.id] ?? 'blue',
  }));

  columnIds.clear();
  for (const column of payload.columns) {
    columnIds.set(`${sprint.id}:${column.slug}`, column.id);
  }
  currentSprintId = sprint.id;

  return {
    workspace,
    sprint,
    sprints,
    columns: payload.columns
      .map((column) => ({
        id: isTaskStatus(column.slug) ? column.slug : ('backlog' as TaskStatus),
        name: column.title,
        order: column.position,
      }))
      .sort((a, b) => a.order - b.order),
    tasks: payload.tasks.map(mapTask),
    members: payload.members.map(mapUser),
    labels,
  };
}

// ------------------------------------------------------------------ session

function readRemoteSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(REMOTE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeRemoteSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(REMOTE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures.
  }
}

function clearRemoteSession(): void {
  try {
    window.localStorage.removeItem(REMOTE_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function persistAuth(
  payload: ApiAuthResponse,
  isDemo: boolean,
): AuthSession {
  setTokens({ access: payload.access, refresh: payload.refresh });
  apiMode = 'remote';

  const session: AuthSession = {
    token: payload.access,
    user: mapUser(payload.user),
    workspaceId: String(payload.workspace_id),
    isDemo,
  };
  writeRemoteSession(session);
  return session;
}

function activeMode(): ApiMode {
  if (apiMode) return apiMode;
  apiMode = getTokens() ? 'remote' : 'mock';
  return apiMode;
}

function useMockMode(): void {
  apiMode = 'mock';
}

// ----------------------------------------------------------------------- auth

export async function getCurrentSession(): Promise<AuthSession | null> {
  const tokens = getTokens();
  const remoteSession = readRemoteSession();

  if (tokens && remoteSession) {
    apiMode = 'remote';
    return remoteSession;
  }

  if (tokens || remoteSession) {
    clearTokens();
    clearRemoteSession();
  }

  const mockSession = await mockApi.getCurrentSession();
  if (mockSession) useMockMode();
  return mockSession;
}

export async function demoLogin(): Promise<AuthSession> {
  try {
    const payload = await apiFetch<ApiAuthResponse>('/auth/demo-login/', {
      method: 'POST',
      body: {},
      authenticated: false,
    });
    return persistAuth(payload, true);
  } catch (error) {
    if (!isBackendUnavailable(error)) throw error;
    useMockMode();
    return mockApi.demoLogin();
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  try {
    const payload = await apiFetch<ApiAuthResponse>('/auth/login/', {
      method: 'POST',
      body: { email, password },
      authenticated: false,
    });
    return persistAuth(payload, payload.is_demo);
  } catch (error) {
    if (!isBackendUnavailable(error)) throw error;
    useMockMode();
    return mockApi.login(email, password);
  }
}

export async function logout(): Promise<void> {
  clearTokens();
  clearRemoteSession();
  useMockMode();
  await mockApi.logout();
}

// ---------------------------------------------------------------------- board

export async function getBoardData(sprintId?: string): Promise<BoardData> {
  if (activeMode() === 'mock') {
    return mockApi.getBoardData(sprintId);
  }

  const query = sprintId ? `?sprint=${encodeURIComponent(sprintId)}` : '';

  try {
    const payload = await apiFetch<ApiBoard>(
      `/workspaces/current/board/${query}`,
    );
    return mapBoard(payload);
  } catch (error) {
    if (isBackendUnavailable(error)) {
      useMockMode();
      return mockApi.getBoardData();
    }
    throw error;
  }
}

async function resolveColumnId(status: TaskStatus): Promise<number | undefined> {
  if (currentSprintId) {
    const cached = columnIds.get(`${currentSprintId}:${status}`);
    if (cached) return cached;
  }

  try {
    await getBoardData();
  } catch {
    return undefined;
  }

  if (!currentSprintId) return undefined;
  return columnIds.get(`${currentSprintId}:${status}`);
}

function labelValue(labelIds: string[] | undefined): string {
  const candidate = labelIds?.[0];
  return candidate && LABEL_VALUES.includes(candidate) ? candidate : '';
}

function assigneeValue(assigneeId: string | null | undefined): number | null {
  if (!assigneeId) return null;
  const numeric = Number(assigneeId);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

// ----------------------------------------------------------------------- tasks

export async function createTask(input: CreateTaskInput): Promise<Task> {
  if (activeMode() === 'mock') return mockApi.createTask(input);

  const status = input.status ?? 'backlog';
  const columnId = await resolveColumnId(status);

  if (!columnId || activeMode() === 'mock') {
    return mockApi.createTask(input);
  }

  const task = await apiFetch<ApiTask>('/tasks/', {
    method: 'POST',
    body: {
      column: columnId,
      title: input.title.trim(),
      description: input.description ?? '',
      priority: input.priority ?? 'medium',
      label: labelValue(input.labelIds),
      story_points: Math.max(0, Math.round(input.storyPoints ?? 0)),
      assignee_id: input.assigneeId ? assigneeValue(input.assigneeId) : null,
    },
  });

  return mapTask(task);
}

export async function updateTask(
  taskId: string,
  patch: UpdateTaskInput,
): Promise<Task> {
  if (activeMode() === 'mock' || taskId.startsWith('tsk_')) {
    return mockApi.updateTask(taskId, patch);
  }

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.storyPoints !== undefined) {
    payload.story_points = Math.max(0, Math.round(patch.storyPoints));
  }
  if (patch.assigneeId !== undefined) {
    payload.assignee_id = assigneeValue(patch.assigneeId);
  }
  if (patch.labelIds !== undefined) {
    payload.label = labelValue(patch.labelIds);
  }

  let updated = await apiFetch<ApiTask>(`/tasks/${taskId}/`, {
    method: 'PATCH',
    body: payload,
  });

  if (patch.status && patch.status !== updated.column_slug) {
    const columnId = await resolveColumnId(patch.status);
    if (columnId) {
      const moved = await apiFetch<ApiMoveResponse>(`/tasks/${taskId}/move/`, {
        method: 'POST',
        body: { target_column_id: columnId, new_position: 100_000 },
      });
      updated = moved.task;
    }
  }

  return mapTask(updated);
}

export async function moveTask(input: MoveTaskInput): Promise<Task[]> {
  if (activeMode() === 'mock' || input.taskId.startsWith('tsk_')) {
    return mockApi.moveTask(input);
  }

  const columnId = await resolveColumnId(input.toStatus);
  if (!columnId) {
    throw new Error('The target column could not be resolved.');
  }

  const response = await apiFetch<ApiMoveResponse>(
    `/tasks/${input.taskId}/move/`,
    {
      method: 'POST',
      body: {
        target_column_id: columnId,
        new_position: input.toIndex,
      },
    },
  );

  return response.tasks.map(mapTask);
}

export async function addComment(taskId: string, body: string): Promise<Comment> {
  if (activeMode() === 'mock' || taskId.startsWith('tsk_')) {
    return mockApi.addComment(taskId, body);
  }

  const comment = await apiFetch<ApiComment>(`/tasks/${taskId}/comments/`, {
    method: 'POST',
    body: { content: body.trim() },
  });

  return mapComment(comment, taskId);
}

// Re-export the typed error so UI code can distinguish validation failures.
export { ApiError };
