import { create } from 'zustand';
import type {
  BoardData,
  BoardFilters,
  Comment,
  CreateTaskInput,
  Priority,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../types';
import * as api from '../services/api';
import { reorderTaskList } from '../lib/tasks';

const emptyFilters: BoardFilters = {
  search: '',
  priority: [],
  assigneeIds: [],
  labelIds: [],
};

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

interface BoardState {
  data: BoardData | null;
  activeSprintId: string | null;
  isLoading: boolean;
  error: string | null;
  filters: BoardFilters;
  openTaskId: string | null;
  loadBoard: (sprintId?: string) => Promise<void>;
  selectSprint: (sprintId: string) => Promise<void>;
  resetBoard: () => void;
  dismissError: () => void;
  setSearch: (search: string) => void;
  togglePriority: (priority: Priority) => void;
  toggleAssignee: (userId: string) => void;
  toggleLabel: (labelId: string) => void;
  setPriorityFilter: (priorities: Priority[]) => void;
  clearFilters: () => void;
  applyQuickFilter: (kind: 'mine' | 'high', userId?: string) => void;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  moveTask: (taskId: string, toStatus: TaskStatus, toIndex: number) => Promise<void>;
  updateTask: (taskId: string, patch: UpdateTaskInput) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  addComment: (taskId: string, body: string) => Promise<Comment | null>;
}

let boardRequest = 0;

export const useBoardStore = create<BoardState>((set, get) => ({
  data: null,
  activeSprintId: null,
  isLoading: false,
  error: null,
  filters: { ...emptyFilters },
  openTaskId: null,

  loadBoard: async (sprintId) => {
    const request = ++boardRequest;
    set({ isLoading: true, error: null });
    try {
      const data = await api.getBoardData(sprintId);
      if (request !== boardRequest) return;
      set({
        data,
        activeSprintId: data.sprint.id,
        isLoading: false,
        openTaskId: null,
      });
    } catch (error) {
      if (request !== boardRequest) return;
      set({
        isLoading: false,
        error: readableError(error, 'The board could not be loaded.'),
      });
    }
  },

  selectSprint: async (sprintId) => {
    if (sprintId === get().activeSprintId) return;
    await get().loadBoard(sprintId);
  },

  resetBoard: () => {
    boardRequest += 1;
    set({
      data: null,
      activeSprintId: null,
      isLoading: false,
      error: null,
      filters: { ...emptyFilters },
      openTaskId: null,
    });
  },

  dismissError: () => set({ error: null }),

  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),

  togglePriority: (priority) =>
    set((state) => ({
      filters: {
        ...state.filters,
        priority: toggleValue(state.filters.priority, priority),
      },
    })),

  toggleAssignee: (userId) =>
    set((state) => ({
      filters: {
        ...state.filters,
        assigneeIds: toggleValue(state.filters.assigneeIds, userId),
      },
    })),

  toggleLabel: (labelId) =>
    set((state) => ({
      filters: {
        ...state.filters,
        labelIds: toggleValue(state.filters.labelIds, labelId),
      },
    })),

  setPriorityFilter: (priorities) =>
    set((state) => ({ filters: { ...state.filters, priority: priorities } })),

  clearFilters: () => set({ filters: { ...emptyFilters } }),

  applyQuickFilter: (kind, userId) => {
    const { filters } = get();
    if (kind === 'mine') {
      if (!userId) return;
      set({
        filters: {
          ...filters,
          assigneeIds: toggleValue(filters.assigneeIds, userId),
        },
      });
      return;
    }

    const highActive =
      filters.priority.length === 2 &&
      filters.priority.includes('urgent') &&
      filters.priority.includes('high');

    set({
      filters: {
        ...filters,
        priority: highActive ? [] : ['urgent', 'high'],
      },
    });
  },

  openTask: (taskId) => set({ openTaskId: taskId }),
  closeTask: () => set({ openTaskId: null }),

  moveTask: async (taskId, toStatus, toIndex) => {
    const data = get().data;
    if (!data) return;

    const previousTasks = data.tasks;
    const sprintId = data.sprint.id;
    const optimisticTasks = reorderTaskList(previousTasks, taskId, toStatus, toIndex);

    set({
      data: { ...data, tasks: optimisticTasks },
      error: null,
    });

    try {
      const tasks = await api.moveTask({ taskId, toStatus, toIndex });
      const current = get().data;
      if (!current || current.sprint.id !== sprintId) return;
      set({ data: { ...current, tasks } });
    } catch (error) {
      const current = get().data;
      if (!current || current.sprint.id !== sprintId) return;
      set({
        data: { ...current, tasks: previousTasks },
        error: readableError(error, 'The issue could not be moved. Changes were rolled back.'),
      });
    }
  },

  updateTask: async (taskId, patch) => {
    const data = get().data;
    if (!data) return;
    const previous = data.tasks.find((task) => task.id === taskId);
    if (!previous) return;

    const optimisticTasks = data.tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task,
    );
    set({ data: { ...data, tasks: optimisticTasks }, error: null });

    try {
      const updated = await api.updateTask(taskId, patch);
      const current = get().data;
      if (!current) return;
      set({
        data: {
          ...current,
          tasks: current.tasks.map((task) => (task.id === taskId ? updated : task)),
        },
      });
    } catch (error) {
      const current = get().data;
      if (!current) return;
      set({
        data: {
          ...current,
          tasks: current.tasks.map((task) => (task.id === taskId ? previous : task)),
        },
        error: readableError(error, 'The issue could not be updated.'),
      });
    }
  },

  createTask: async (input) => {
    const task = await api.createTask(input);
    const current = get().data;
    if (current) {
      set({
        data: { ...current, tasks: [...current.tasks, task] },
        openTaskId: task.id,
      });
    }
    return task;
  },

  addComment: async (taskId, body) => {
    try {
      const comment = await api.addComment(taskId, body);
      const current = get().data;
      if (current) {
        set({
          data: {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === taskId
                ? { ...task, comments: [...task.comments, comment] }
                : task,
            ),
          },
        });
      }
      return comment;
    } catch (error) {
      set({ error: readableError(error, 'The comment could not be posted.') });
      return null;
    }
  },
}));
