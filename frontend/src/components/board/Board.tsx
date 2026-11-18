import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { isTaskStatus } from '../../lib/constants';
import { filterTasks, sortTasksByOrder } from '../../lib/tasks';
import { useBoardStore } from '../../store/useBoardStore';
import type { Task, TaskStatus } from '../../types';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';

interface DropTarget {
  columnId: TaskStatus;
  index: number;
  previewIndex: number;
}

export function Board() {
  const data = useBoardStore((state) => state.data);
  const filters = useBoardStore((state) => state.filters);
  const moveTask = useBoardStore((state) => state.moveTask);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleTasks = useMemo(
    () => (data ? filterTasks(data.tasks, filters, { members: data.members }) : []),
    [data, filters],
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    data?.columns.forEach((column) => {
      map.set(
        column.id,
        sortTasksByOrder(visibleTasks.filter((task) => task.status === column.id)),
      );
    });
    return map;
  }, [data, visibleTasks]);

  if (!data) return null;

  const activeTask = data.tasks.find((task) => task.id === activeId);

  const resolveTarget = (over: Over | null, movingId: string | null): DropTarget | null => {
    if (!over) return null;
    const overId = String(over.id);

    if (isTaskStatus(overId)) {
      const allInColumn = sortTasksByOrder(
        data.tasks.filter((task) => task.status === overId),
      );
      const visibleInColumn = tasksByColumn.get(overId) ?? [];
      return {
        columnId: overId,
        index: allInColumn.filter((task) => task.id !== movingId).length,
        previewIndex: visibleInColumn.filter((task) => task.id !== movingId).length,
      };
    }

    const overTask = data.tasks.find((task) => task.id === overId);
    if (!overTask) return null;

    const allInColumn = sortTasksByOrder(
      data.tasks.filter((task) => task.status === overTask.status),
    );
    const visibleInColumn = tasksByColumn.get(overTask.status) ?? [];
    const fullIndex = allInColumn.findIndex((task) => task.id === overTask.id);
    const previewIndex = visibleInColumn.findIndex((task) => task.id === overTask.id);

    return {
      columnId: overTask.status,
      index: fullIndex >= 0 ? fullIndex : allInColumn.length,
      previewIndex:
        previewIndex >= 0 ? previewIndex : visibleInColumn.filter((task) => task.id !== movingId).length,
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDropTarget(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setDropTarget(resolveTarget(event.over, String(event.active.id)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const movingId = String(event.active.id);
    const target = resolveTarget(event.over, movingId);
    setActiveId(null);
    setDropTarget(null);

    if (!target) return;
    if (event.over && String(event.over.id) === movingId) return;
    void moveTask(movingId, target.columnId, target.index);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDropTarget(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden px-2 py-3 lg:px-4">
        {data.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn.get(column.id) ?? []}
            labels={data.labels}
            members={data.members}
            dropIndex={
              activeId && dropTarget?.columnId === column.id ? dropTarget.previewIndex : null
            }
            isDragging={Boolean(activeId)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[268px] rotate-[1.5deg]">
            <TaskCard
              task={activeTask}
              labels={data.labels}
              assignee={data.members.find((member) => member.id === activeTask.assigneeId)}
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
