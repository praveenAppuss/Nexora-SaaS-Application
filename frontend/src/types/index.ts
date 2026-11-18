export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';

export type SprintStatus = 'active' | 'completed' | 'planned';

export type Theme = 'dark' | 'light';

export type AvatarColor =
  | 'indigo'
  | 'rose'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'pink';

export type LabelColor =
  | 'blue'
  | 'emerald'
  | 'red'
  | 'violet'
  | 'amber'
  | 'sky'
  | 'pink'
  | 'lime';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: AvatarColor;
  initials: string;
}

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberIds: string[];
}

export interface Sprint {
  id: string;
  workspaceId: string;
  name: string;
  status: SprintStatus;
  goal: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Column {
  id: TaskStatus;
  name: string;
  order: number;
}

export interface Comment {
  id: string;
  taskId: string;
  author: User;
  body: string;
  createdAt: string;
}

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assignee_changed'
  | 'title_changed'
  | 'description_changed'
  | 'labels_changed'
  | 'points_changed'
  | 'updated';

export interface Activity {
  id: string;
  taskId: string;
  actor: User;
  type: ActivityType;
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  key: string;
  workspaceId: string;
  sprintId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  storyPoints: number;
  assigneeId: string | null;
  labelIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  activity: Activity[];
}

export interface BoardData {
  workspace: Workspace;
  sprint: Sprint;
  sprints: Sprint[];
  columns: Column[];
  tasks: Task[];
  members: User[];
  labels: Label[];
}

export interface BoardFilters {
  search: string;
  priority: Priority[];
  assigneeIds: string[];
  labelIds: string[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  storyPoints?: number;
  assigneeId?: string | null;
  labelIds?: string[];
  sprintId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  storyPoints?: number;
  assigneeId?: string | null;
  labelIds?: string[];
}

export interface MoveTaskInput {
  taskId: string;
  toStatus: TaskStatus;
  toIndex: number;
}

export interface AuthSession {
  token: string;
  user: User;
  workspaceId: string;
  isDemo: boolean;
}
