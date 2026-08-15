"use client"

import { useMemo, useState } from "react"
import {
  Calendar,
  Check,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorAlert } from "@/components/alert-message"
import { TaskModal } from "@/components/task-modal"
import {
  ActivityRowsSkeleton,
  Sk,
  StatCardsSkeleton,
  TaskRowsSkeleton,
  WeekChartSkeleton,
} from "@/components/skeletons"
import {
  DASHBOARD_SCOPES,
  dashboardApi,
  errorMessage,
  invalidate,
  keys,
  mutateCache,
  todosApi,
  useQuery,
  type ActivityItem,
  type Statistics,
  type Todo,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  changeLabel,
  relativeTime,
  shortDate,
  todayLabel,
} from "@/lib/format"
import type { Screen } from "@/lib/screens"

type TaskFilter = "all" | "personal" | "group"

/** The activity feed is a glance, not a log — the five most recent entries. */
const ACTIVITY_LIMIT = 5

function tagFor(type: string) {
  switch (type) {
    case "note":
      return "NOTE"
    case "post":
      return "POST"
    case "task":
      return "TASK"
    case "group":
      return "GRP"
    default:
      return type.slice(0, 4).toUpperCase()
  }
}

export function Dashboard({
  narrow,
  onNavigate,
}: {
  narrow: boolean
  onNavigate: (screen: Screen) => void
}) {
  const { user } = useAuth()

  const [filter, setFilter] = useState<TaskFilter>("all")
  const [quickTask, setQuickTask] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Three independent queries rather than one combined loader: each renders as
  // soon as it lands, and one slow endpoint no longer holds up the other two.
  // On a return visit all three are already cached, so the screen paints from
  // memory and revalidates behind what you are looking at.
  const statsQuery = useQuery<Statistics>(keys.stats(), dashboardApi.statistics)
  const activityQuery = useQuery<ActivityItem[]>(
    keys.activity(),
    dashboardApi.recentActivity
  )
  const todosQuery = useQuery<Todo[]>(keys.todos(), todosApi.list)

  const stats = statsQuery.data ?? null
  const activity = useMemo(
    () => (activityQuery.data ?? []).slice(0, ACTIVITY_LIMIT),
    [activityQuery.data]
  )
  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data])

  const loading =
    statsQuery.isLoading || activityQuery.isLoading || todosQuery.isLoading

  // As before, only a total failure is worth a banner — a single endpoint being
  // down still leaves a usable screen.
  const allFailed =
    !!statsQuery.error && !!activityQuery.error && !!todosQuery.error
  const failure = allFailed ? todosQuery.error : null

  /** Optimistic local edit of the cached task list, shared by the handlers. */
  const patchTodos = (update: (current: Todo[]) => Todo[]) =>
    mutateCache<Todo[]>(keys.todos(), update)

  const visibleTasks = useMemo(
    () => todos.filter((todo) => filter === "all" || todo.type === filter),
    [todos, filter]
  )

  const doneCount = todos.filter((todo) => todo.completed).length

  // Study-hours-per-day isn't tracked by the API; this charts the tasks you
  // actually completed on each of the last seven days, from their timestamps.
  const week = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - offset)
      const next = new Date(day)
      next.setDate(next.getDate() + 1)

      const count = todos.filter((todo) => {
        if (!todo.completed) return false
        const updated = new Date(todo.updatedAt).getTime()
        return updated >= day.getTime() && updated < next.getTime()
      }).length

      days.push({
        label: day.toLocaleDateString(undefined, { weekday: "narrow" }),
        count,
      })
    }
    return days
  }, [todos])

  const weekMax = Math.max(1, ...week.map((day) => day.count))

  const statCards = useMemo(() => {
    if (!stats) return []
    const total = Math.max(1, stats.tasks.assigned)
    return [
      {
        label: "Notes",
        value: stats.notes.total,
        unit: "total",
        change: changeLabel(stats.notes.change),
        pct: Math.min(100, (stats.notes.total / Math.max(1, stats.notes.total)) * 100),
      },
      {
        label: "Tasks done",
        value: stats.tasks.completed.total,
        unit: `of ${stats.tasks.assigned}`,
        change: changeLabel(stats.tasks.change),
        pct: Math.min(100, (stats.tasks.completed.total / total) * 100),
      },
      {
        label: "Forum posts",
        value: stats.posts.total,
        unit: "written",
        change: changeLabel(stats.posts.change),
        pct: stats.posts.total > 0 ? 100 : 0,
      },
      {
        label: "Groups",
        value: stats.groups.total,
        unit: "joined",
        change: changeLabel(stats.groups.change),
        pct: stats.groups.total > 0 ? 100 : 0,
      },
    ]
  }, [stats])

  async function addQuickTask() {
    const title = quickTask.trim()
    if (!title) return
    setQuickTask("")
    try {
      const todo = await todosApi.create({
        title,
        priority: "medium",
        type: "personal",
        category: "Personal",
      })
      patchTodos((current) => [todo, ...current])
      // The stat cards and activity feed count tasks too.
      invalidate(...DASHBOARD_SCOPES)
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not add the task.")
      )
      setQuickTask(title)
    }
  }

  async function toggleTask(todo: Todo) {
    // Optimistic — the API returns only a message.
    patchTodos((current) =>
      current.map((item) =>
        item._id === todo._id ? { ...item, completed: !item.completed } : item
      )
    )
    try {
      await todosApi.toggle(todo._id)
      invalidate(...DASHBOARD_SCOPES)
    } catch (caught) {
      patchTodos((current) =>
        current.map((item) =>
          item._id === todo._id ? { ...item, completed: todo.completed } : item
        )
      )
      toast.error(
        errorMessage(caught, "Could not update the task.")
      )
    }
  }

  async function deleteTask(todo: Todo) {
    const snapshot = todos
    patchTodos((current) => current.filter((item) => item._id !== todo._id))
    try {
      await todosApi.remove(todo._id)
      invalidate(...DASHBOARD_SCOPES)
    } catch (caught) {
      patchTodos(() => snapshot)
      toast.error(
        errorMessage(caught, "Could not delete the task.")
      )
    }
  }

  return (
    <div className="animate-rise-in flex max-w-[1320px] flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-1">{todayLabel()}</p>
          <h1
            className="m-0 text-[clamp(30px,3.4vw,40px)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              lineHeight: 1.05,
            }}
          >
            Welcome back, {user?.username ?? "there"}.
          </h1>
          <p
            className="m-0 mt-1.5 text-sm"
            style={{
              color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
            }}
          >
            {doneCount} of {todos.length} tasks done
            {stats ? ` · ${stats.groups.total} groups · ${stats.notes.total} notes` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("notes")}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[var(--color-divider)] px-3.5 py-2 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]"
          >
            <FileText size={15} strokeWidth={1.5} />
            New note
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-sm"
            style={{
              background: "var(--color-accent)",
              borderColor: "var(--color-accent)",
              color: "var(--color-bg)",
            }}
          >
            <Sparkles size={15} strokeWidth={1.5} />
            New task
          </button>
        </div>
      </div>

      {!!failure && (
        <ErrorAlert error={failure} title="Could not load your dashboard." />
      )}

      {/* Stat cards */}
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {loading && !stats ? (
          <StatCardsSkeleton />
        ) : (
          statCards.map((card, index) => {
            const stat = card as (typeof statCards)[number] | undefined
            return (
              <div
                key={stat?.label ?? index}
                className="bp bp-hover grid gap-2.5 px-4 pb-3.5 pt-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] uppercase [letter-spacing:.14em]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 55%, transparent)",
                    }}
                  >
                    {stat?.label ?? "…"}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-accent-700)",
                    }}
                  >
                    {stat?.change ?? ""}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-[38px]"
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      lineHeight: 0.9,
                    }}
                  >
                    {stat?.value ?? "—"}
                  </span>
                  <span
                    className="pb-[5px] text-[11px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 45%, transparent)",
                    }}
                  >
                    {stat?.unit ?? ""}
                  </span>
                </div>
                <div
                  className="h-[3px] overflow-hidden rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-text) 10%, transparent)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${stat?.pct ?? 0}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: narrow
            ? "1fr"
            : "minmax(0, 1.25fr) minmax(0, 1fr)",
        }}
      >
        {/* Task queue */}
        <section className="bp flex min-w-0 flex-col p-0">
          <div className="grid flex-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-divider)] px-4.5 py-4">
            <div className="min-w-0">
              <h2
                className="m-0 text-[19px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Task queue
              </h2>
              <p
                className="m-0 mt-0.5 text-xs"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                {doneCount} of {todos.length} complete
              </p>
            </div>
            <div className="seg-group">
              {(["all", "personal", "group"] as TaskFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className="seg-btn"
                  data-active={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-none gap-2 border-b border-[var(--color-divider)] px-4.5 py-3">
            <input
              className="field-input h-[38px]"
              placeholder="Add a task and press Enter…"
              value={quickTask}
              onChange={(event) => setQuickTask(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addQuickTask()
              }}
            />
            <button
              type="button"
              title="New task with details"
              aria-label="New task with details"
              onClick={() => setModalOpen(true)}
              className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[10px] border"
              style={{
                background: "var(--color-accent)",
                borderColor: "var(--color-accent)",
                color: "var(--color-bg)",
              }}
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="max-h-[470px] flex-1 overflow-auto">
            {loading && todos.length === 0 ? (
              <TaskRowsSkeleton />
            ) : visibleTasks.length === 0 ? (
              <p className="m-0 px-4.5 py-8 text-center text-[13px] opacity-50">
                {todos.length === 0
                  ? "No tasks yet. Add one above."
                  : `No ${filter} tasks.`}
              </p>
            ) : (
              visibleTasks.map((todo) => (
                <div
                  key={todo._id}
                  className="hover-row animate-rise-in-fast grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b px-4.5 py-3.5"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--color-text) 8%, transparent)",
                  }}
                >
                  <button
                    type="button"
                    title="Toggle task"
                    aria-label="Toggle task"
                    className="check-box mt-0.5 h-5 w-5"
                    data-active={todo.completed}
                    onClick={() => toggleTask(todo)}
                  >
                    {todo.completed && <Check size={13} strokeWidth={2.4} />}
                  </button>

                  <div className="grid min-w-0 gap-[7px]">
                    <span
                      className="text-[14.5px] font-medium leading-[1.35]"
                      style={
                        todo.completed
                          ? {
                              textDecoration: "line-through",
                              color:
                                "color-mix(in srgb, var(--color-text) 42%, transparent)",
                            }
                          : undefined
                      }
                    >
                      {todo.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`prio prio-${todo.priority}`}>
                        {todo.priority}
                      </span>
                      {todo.category && (
                        <span className="pill pill-neutral">{todo.category}</span>
                      )}
                      {todo.deadline && (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11.5px]"
                          style={{
                            color:
                              "color-mix(in srgb, var(--color-text) 50%, transparent)",
                          }}
                        >
                          <Calendar size={12} strokeWidth={1.5} />
                          {shortDate(todo.deadline)}
                        </span>
                      )}
                      {todo.type === "group" && (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11.5px]"
                          style={{ color: "var(--color-accent-700)" }}
                        >
                          <Users size={12} strokeWidth={1.5} />
                          {todo.assignedMembers?.length ?? 0} assigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-none items-center">
                    <button
                      type="button"
                      title="Edit task"
                      aria-label="Edit task"
                      onClick={() => setEditingTodo(todo)}
                      className="p-1"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 45%, transparent)",
                      }}
                    >
                      <Pencil size={15} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      title="Delete task"
                      aria-label="Delete task"
                      onClick={() => deleteTask(todo)}
                      className="p-1"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Activity */}
          <section className="bp p-0">
            <div className="border-b border-[var(--color-divider)] px-4.5 py-4">
              <h2
                className="m-0 text-[19px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Activity
              </h2>
              <p
                className="m-0 mt-0.5 text-xs"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                Your last {ACTIVITY_LIMIT} across notes, tasks, posts and groups
              </p>
            </div>
            <div>
              {loading && activity.length === 0 ? (
                <ActivityRowsSkeleton />
              ) : activity.length === 0 ? (
                <p className="m-0 px-4.5 py-8 text-center text-[13px] opacity-50">
                  Nothing recorded yet.
                </p>
              ) : (
                activity.map((item, index) => (
                  <div
                    key={`${item.title}-${item.date}-${index}`}
                    className="hover-row grid grid-cols-[auto_1fr] gap-3 border-b px-4.5 py-3.5"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--color-text) 8%, transparent)",
                    }}
                  >
                    <span
                      className="avatar-plain h-7 w-7 text-[10.5px]"
                      style={{ color: "var(--color-accent-700)" }}
                    >
                      {tagFor(item.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13.5px] font-medium">
                        {item.title || item.action}
                      </p>
                      <p
                        className="m-0 mt-0.5 truncate text-xs"
                        style={{
                          color:
                            "color-mix(in srgb, var(--color-text) 55%, transparent)",
                        }}
                      >
                        {item.action}
                      </p>
                      <p
                        className="m-0 mt-[3px] text-[11px]"
                        style={{
                          color:
                            "color-mix(in srgb, var(--color-text) 45%, transparent)",
                        }}
                      >
                        {relativeTime(item.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* This week */}
          <section className="bp grid gap-3.5 p-4.5">
            <div className="flex items-center justify-between gap-2.5">
              <h2
                className="m-0 text-[19px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                This week
              </h2>
              {loading && !stats ? (
                <Sk className="h-5 w-16 rounded-full" />
              ) : (
                <span className="pill pill-accent">
                  {week.reduce((sum, day) => sum + day.count, 0)} done
                </span>
              )}
            </div>
            {loading && !stats ? (
              <WeekChartSkeleton />
            ) : (
            <div className="grid h-[88px] grid-cols-7 items-end gap-1.5">
              {week.map((day, index) => (
                <div key={index} className="grid justify-items-center gap-1.5">
                  <div
                    className="w-full rounded-t-[7px] transition-[height] duration-500"
                    style={{
                      height: `${Math.max(4, (day.count / weekMax) * 62)}px`,
                      background:
                        day.count >= weekMax && day.count > 0
                          ? "var(--color-accent)"
                          : "color-mix(in srgb, var(--color-accent) 38%, transparent)",
                    }}
                  />
                  <span
                    className="text-[10px] [letter-spacing:.08em]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 50%, transparent)",
                    }}
                  >
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
            )}
            <p
              className="m-0 text-xs"
              style={{
                color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
              }}
            >
              Tasks completed per day over the last seven days.
            </p>
          </section>
        </div>
      </div>

      {modalOpen && (
        <TaskModal
          initialTitle={quickTask}
          onClose={() => setModalOpen(false)}
          onSaved={(todo) => {
            patchTodos((current) => [todo, ...current])
            invalidate(...DASHBOARD_SCOPES)
            setQuickTask("")
            toast.success("Task added")
          }}
        />
      )}

      {editingTodo && (
        <TaskModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSaved={(saved) => {
            patchTodos((current) =>
              current.map((item) => (item._id === saved._id ? saved : item))
            )
            invalidate(...DASHBOARD_SCOPES)
            toast.success("Task updated")
          }}
        />
      )}
    </div>
  )
}
