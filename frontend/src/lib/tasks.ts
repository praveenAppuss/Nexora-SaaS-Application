import type { BoardFilters, Task, TaskStatus, User } from '../types';

export function sortTasksByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.order - b.order);
}

export function tasksInColumn(tasks: Task[], status: TaskStatus): Task[] {
  return sortTasksByOrder(tasks.filter((task) => task.status === status));
}

export function totalStoryPoints(tasks: Task[]): number {
  return tasks.reduce((sum, task) => sum + task.storyPoints, 0);
}

export interface FilterContext {
  members: User[];
}

export function filterTasks(
  tasks: Task[],
  filters: BoardFilters,
  context: FilterContext,
): Task[] {
  const query = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
      return false;
    }

    if (
      filters.assigneeIds.length > 0 &&
      (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId))
    ) {
      return false;
    }

    if (
      filters.labelIds.length > 0 &&
      !task.labelIds.some((labelId) => filters.labelIds.includes(labelId))
    ) {
      return false;
    }

    if (query.length > 0) {
      const assignee = context.members.find((member) => member.id === task.assigneeId);
      const haystack = [task.key, task.title, task.description, assignee?.name ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

/**
 * Pure optimistic reorder used by both the UI store and the mock API.
 * Orders are normalised for the source and destination columns so a
 * drag stays stable even after filtered views or concurrent mutations.
 */
export function reorderTaskList(
  tasks: Task[],
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number,
): Task[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;

  const previousStatus = moving.status;
  const others = tasks.filter((task) => task.id !== taskId);
  const destination = others
    .filter((task) => task.status === toStatus)
    .sort((a, b) => a.order - b.order);

  const insertAt = Math.max(0, Math.min(Math.trunc(toIndex), destination.length));
  const nextDestination = [...destination];
  nextDestination.splice(insertAt, 0, {
    ...moving,
    status: toStatus,
    updatedAt: new Date().toISOString(),
  });

  const destinationOrder = new Map(nextDestination.map((task, index) => [task.id, index]));
  const sourceOrder = new Map(
    others
      .filter((task) => task.status === previousStatus)
      .sort((a, b) => a.order - b.order)
      .map((task, index) => [task.id, index]),
  );

  return tasks.map((task) => {
    if (task.id === taskId) {
      const updated = nextDestination.find((item) => item.id === taskId);
      if (!updated) return task;
      return { ...updated, order: destinationOrder.get(task.id) ?? updated.order };
    }
    if (destinationOrder.has(task.id)) {
      return { ...task, order: destinationOrder.get(task.id) ?? task.order };
    }
    if (previousStatus !== toStatus && sourceOrder.has(task.id)) {
      return { ...task, order: sourceOrder.get(task.id) ?? task.order };
    }
    return task;
  });
}
