"use client"

import { useEffect, useState } from "react"
import { InlineError } from "@/components/alert-message"
import { Modal } from "@/components/modal"
import {
  errorMessage,
  groupsApi,
  notesApi,
  type Group,
  type Note,
} from "@/lib/api"
import { parseTags } from "@/lib/format"

export function NoteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (note: Note) => void
}) {
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState("")
  const [type, setType] = useState<"personal" | "group">("personal")
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function save() {
    const trimmed = title.trim()
    if (!trimmed || saving) return
    if (type === "group" && !groupId) {
      setError("Pick a group for this note.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      // `content` is required by the backend schema, so seed an empty body.
      const note = await notesApi.create({
        title: trimmed,
        content: "<p></p>",
        type,
        tags: parseTags(tags),
        ...(type === "group" ? { group: groupId } : {}),
      })
      onCreated(note)
      onClose()
    } catch (caught) {
      setError(
        errorMessage(caught, "Could not create the note.")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      kicker="Notes"
      title="New note"
      onClose={onClose}
      footer={
        <>
          <span
            className="text-[11.5px]"
            style={{
              color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
            }}
          >
            You can edit all of this later
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
            {saving ? "Creating…" : "Create note"}
          </button>
        </>
      }
    >
      <label className="field-label">
        Title
        <input
          autoFocus
          className="field-input h-10"
          placeholder="e.g. Linear Algebra — Eigenvalues"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save()
          }}
        />
      </label>

      <label className="field-label">
        Tags
        <input
          className="field-input h-10"
          placeholder="physics, quantum, revision"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </label>

      <div className="grid gap-[7px]">
        <span className="field-label">Visibility</span>
        <div className="seg-group w-fit">
          <button
            type="button"
            className="seg-btn"
            data-active={type === "personal"}
            onClick={() => setType("personal")}
          >
            Personal
          </button>
          <button
            type="button"
            className="seg-btn"
            data-active={type === "group"}
            onClick={() => setType("group")}
          >
            Group
          </button>
        </div>
      </div>

      {type === "group" && (
        <label className="field-label">
          Group
          {groups.length === 0 ? (
            <span className="text-[13px] normal-case tracking-normal opacity-60">
              You are not in any groups yet.
            </span>
          ) : (
            <select
              className="field-input h-[38px]"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {error && (
        <InlineError>{error}</InlineError>
      )}
    </Modal>
  )
}
