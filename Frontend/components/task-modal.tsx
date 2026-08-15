"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { InlineError } from "@/components/alert-message"
import { Modal } from "@/components/modal"
import {
  errorMessage,
  groupsApi,
  todosApi,
  type Group,
  type Priority,
  type Todo,
  type UserRef,
} from "@/lib/api"
import { dateInputValue, initialsOf, refId, refName } from "@/lib/format"

const PRIORITIES: Priority[] = ["low", "medium", "high"]
const CATEGORIES = ["Academic", "Personal", "Group Work"]

/**
 * Creating and editing a task are the same form over the same fields, so they
 * are one component. Passing a todo switches it to editing that task.
 */
export function TaskModal({
  todo,
  initialTitle = "",
  onClose,
  onSaved,
}: {
  todo?: Todo
  initialTitle?: string
  onClose: () => void
  onSaved: (todo: Todo) => void
}) {
  const isEdit = !!todo
  const [title, setTitle] = useState(todo?.title ?? initialTitle)
  const [description, setDescription] = useState(todo?.discription ?? "")
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? "medium")
  const [category, setCategory] = useState(todo?.category || "Academic")
  const [due, setDue] = useState(dateInputValue(todo?.deadline))
  const [type, setType] = useState<"personal" | "group">(
    todo?.type ?? "personal"
  )
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<string>(refId(todo?.group) ?? "")
  const [assignees, setAssignees] = useState<string[]>(
    (todo?.assignedMembers ?? [])
      .map((member) => refId(member))
      .filter((id): id is string => !!id)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group tasks need a group and its member list to assign from.
  useEffect(() => {
    if (type !== "group" || groups.length) return
    groupsApi
      .list()
      .then((data) => {
        setGroups(data)
        if (data.length && !groupId) setGroupId(data[0]._id)
      })
      .catch(() => setError("Could not load your groups."))
  }, [type, groups.length, groupId])

  const activeGroup = groups.find((group) => group._id === groupId)
  const members = (activeGroup?.members ?? []) as (string | UserRef)[]

  async function save() {
    const trimmed = title.trim()
    if (!trimmed || saving) return

    if (type === "group" && !groupId) {
      setError("Pick a group for this task.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const body = {
        title: trimmed,
        // Always sent, never omitted: the API treats a missing field as "leave
        // it alone", so an omitted empty string would make clearing the
        // description or the due date impossible once one had been set.
        discription: description.trim(),
        category,
        priority,
        type,
        deadline: due || null,
        ...(type === "group" ? { groupId, assignedMembers: assignees } : {}),
      }
      const saved = todo
        ? await todosApi.update(todo._id, body)
        : await todosApi.create(body)
      // An update response can come back thinner than the row it replaces —
      // no populated group, no per-user completed flag — so the original stays
      // underneath it rather than being swapped out wholesale.
      onSaved(todo ? { ...todo, ...saved } : saved)
      onClose()
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          isEdit ? "Could not save your changes." : "Could not create the task."
        )
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      kicker="Task queue"
      title={isEdit ? "Edit task" : "New task"}
      onClose={onClose}
      footer={
        <>
          <span
            className="whitespace-nowrap text-[11.5px]"
            style={{
              color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
            }}
          >
            {type === "group"
              ? "Everyone picked gets the task"
              : "Only you will see this task"}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="rounded-[10px] border border-[var(--color-divider)] px-4 py-2 text-[13px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-btn"
            data-active={!!title.trim() && !saving}
            disabled={!title.trim() || saving}
            onClick={save}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : "Adding…"
              : isEdit
                ? "Save changes"
                : "Add task"}
          </button>
        </>
      }
    >
      <label className="field-label">
        Task
        <input
          autoFocus
          className="field-input h-10"
          placeholder="e.g. Finish problem set 4"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save()
          }}
        />
      </label>

      <label className="field-label">
        Details
        <textarea
          className="field-input text-[13.5px]"
          style={{ minHeight: 66 }}
          placeholder="What exactly needs doing?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <div className="grid gap-[15px] [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <div className="grid gap-[7px]">
          <span className="field-label">Priority</span>
          <div className="seg-group w-fit">
            {PRIORITIES.map((level) => (
              <button
                key={level}
                type="button"
                className="seg-btn"
                data-active={priority === level}
                onClick={() => setPriority(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <label className="field-label">
          Due date
          <input
            className="field-input h-[38px]"
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-[7px]">
        <span className="field-label">Category</span>
        <div className="seg-group w-fit">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              className="seg-btn"
              data-active={category === option}
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-[7px]">
        <span className="field-label">Assigned to</span>
        <div className="seg-group w-fit">
          <button
            type="button"
            className="seg-btn"
            data-active={type === "personal"}
            onClick={() => {
              setType("personal")
              setAssignees([])
            }}
          >
            Just me
          </button>
          <button
            type="button"
            className="seg-btn"
            data-active={type === "group"}
            onClick={() => setType("group")}
          >
            Group task
          </button>
        </div>
      </div>

      {type === "group" && (
        <div className="grid gap-2 rounded-[14px] border border-[var(--color-divider)] p-3.5">
          {groups.length === 0 ? (
            <p className="m-0 text-[13px] opacity-60">
              You are not in any groups yet. Create one from the Groups
              screen first.
            </p>
          ) : (
            <>
              <label className="field-label">
                Group
                <select
                  className="field-input h-[38px]"
                  value={groupId}
                  onChange={(event) => {
                    setGroupId(event.target.value)
                    setAssignees([])
                  }}
                >
                  {groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <span className="field-label mt-1">
                {assignees.length
                  ? `${assignees.length} selected`
                  : "Pick teammates"}
              </span>

              {members.map((member) => {
                const id = refId(member)
                if (!id) return null
                const name = refName(member)
                const checked = assignees.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2 py-[7px] text-left"
                    style={{
                      background: checked
                        ? "color-mix(in srgb, var(--color-accent) 9%, transparent)"
                        : "transparent",
                    }}
                    onClick={() =>
                      setAssignees((current) =>
                        checked
                          ? current.filter((value) => value !== id)
                          : [...current, id]
                      )
                    }
                  >
                    <span
                      className="check-box h-[18px] w-[18px]"
                      data-active={checked}
                      style={{ borderRadius: 6 }}
                    >
                      {checked && <Check size={12} strokeWidth={2.4} />}
                    </span>
                    <span className="avatar-plain h-[26px] w-[26px] text-[10px]">
                      {initialsOf(name)}
                    </span>
                    <span className="whitespace-nowrap text-[13.5px]">
                      {name}
                    </span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      {error && (
        <InlineError>{error}</InlineError>
      )}
    </Modal>
  )
}
