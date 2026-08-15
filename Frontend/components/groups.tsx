"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Layers,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { ErrorAlert, InlineError } from "@/components/alert-message"
import { IconButton } from "@/components/icon-button"
import { Modal } from "@/components/modal"
import {
  ListCardsSkeleton,
  PeopleRowsSkeleton,
} from "@/components/skeletons"
import { useConfirm } from "@/lib/confirm"
import {
  DASHBOARD_SCOPES,
  errorMessage,
  groupsApi,
  invalidate,
  keys,
  mutateCache,
  useQuery,
  usersApi,
  type Group,
  type GroupInvite,
  type User,
  type UserRef,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { initialsOf, refId, refName, relativeTime } from "@/lib/format"

type GroupTab = "members" | "details"

export function Groups({ narrow }: { narrow: boolean }) {
  const confirm = useConfirm()
  const { user } = useAuth()

  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tab, setTab] = useState<GroupTab>("members")
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [showDetailOnNarrow, setShowDetailOnNarrow] = useState(false)

  const groupsQuery = useQuery<Group[]>(keys.groups(), groupsApi.list)
  // An invite endpoint that is down should not take the group list with it.
  const invitesQuery = useQuery<GroupInvite[]>(keys.invites(), () =>
    groupsApi.myInvites().catch(() => [] as GroupInvite[])
  )

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])
  const invites = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data])
  const loading = groupsQuery.isLoading
  const failure = groupsQuery.error

  // The list now arrives with members and admins populated, so the open group
  // is just a row out of it — no second request, and switching between groups
  // costs nothing at all.
  const active = useMemo(
    () => groups.find((group) => group._id === activeId) ?? null,
    [groups, activeId]
  )

  // Open the first group once the list lands, unless something is open already.
  useEffect(() => {
    setActiveId((current) => current ?? groups[0]?._id ?? null)
  }, [groups])

  /** Re-read after a membership change; the list is the source for both panes. */
  const reloadActive = groupsQuery.refresh

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(needle) ||
        (group.description ?? "").toLowerCase().includes(needle)
    )
  }, [groups, query])

  const isAdmin = useMemo(() => {
    if (!active || !user) return false
    return (active.admins ?? []).some((admin) => refId(admin) === user._id)
  }, [active, user])

  async function respondToInvite(invite: GroupInvite, accept: boolean) {
    try {
      const result = accept
        ? await groupsApi.acceptInvite(invite._id)
        : await groupsApi.declineInvite(invite._id)
      toast.success(result.message)
      mutateCache<GroupInvite[]>(keys.invites(), (current) =>
        current.filter((item) => item._id !== invite._id)
      )
      if (accept) invalidate(keys.groups(), ...DASHBOARD_SCOPES)
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not respond to the invite.")
      )
    }
  }

  async function leaveGroup() {
    if (!active) return
    const ok = await confirm({
      title: `Leave “${active.name}”?`,
      body: "You'll lose access to the group's notes, tasks and chat. An admin can invite you back.",
      confirmLabel: "Leave group",
    })
    if (!ok) return
    try {
      await groupsApi.leave(active._id)
      mutateCache<Group[]>(keys.groups(), (current) =>
        current.filter((g) => g._id !== active._id)
      )
      invalidate(...DASHBOARD_SCOPES)
      setActiveId(null)
      setShowDetailOnNarrow(false)
      toast.success("You left the group")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not leave the group.")
      )
    }
  }

  async function deleteGroup() {
    if (!active) return
    const ok = await confirm({
      title: `Delete “${active.name}”?`,
      body: "The group and everything shared in it goes with it. This cannot be undone.",
      confirmLabel: "Delete group",
    })
    if (!ok) return
    try {
      await groupsApi.remove(active._id)
      mutateCache<Group[]>(keys.groups(), (current) =>
        current.filter((g) => g._id !== active._id)
      )
      invalidate(...DASHBOARD_SCOPES)
      setActiveId(null)
      setShowDetailOnNarrow(false)
      toast.success("Group deleted")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not delete the group.")
      )
    }
  }

  async function removeMember(memberId: string, name: string) {
    if (!active) return
    const ok = await confirm({
      title: `Remove ${name}?`,
      body: `They'll lose access to “${active.name}” straight away. You can invite them again later.`,
      confirmLabel: "Remove",
    })
    if (!ok) return
    try {
      await groupsApi.removeMember(active._id, memberId)
      await reloadActive()
      toast.success("Member removed")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not remove the member.")
      )
    }
  }

  async function promote(memberId: string) {
    if (!active) return
    try {
      await groupsApi.promote(active._id, memberId)
      await reloadActive()
      toast.success("Promoted to admin")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not promote.")
      )
    }
  }

  async function demote(memberId: string, name: string) {
    if (!active) return
    const self = memberId === user?._id
    const ok = await confirm({
      title: self ? "Step down as admin?" : `Demote ${name}?`,
      body: self
        ? "You'll stay in the group as a member and lose the admin controls."
        : `${name} stays in the group but loses the admin controls.`,
      confirmLabel: self ? "Step down" : "Demote",
    })
    if (!ok) return
    try {
      await groupsApi.demote(active._id, memberId)
      await reloadActive()
      toast.success(self ? "You are no longer an admin" : "Demoted to member")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not demote.")
      )
    }
  }

  const showList = !narrow || !showDetailOnNarrow
  const showDetail = !narrow || showDetailOnNarrow

  return (
    <div className="animate-rise-in flex max-w-[1440px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <span
            className="absolute left-[11px] top-1/2 grid -translate-y-1/2"
            style={{
              color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
            }}
          >
            <Search size={15} strokeWidth={1.5} />
          </span>
          <input
            className="field-input h-[38px] pl-[34px]"
            placeholder="Search groups…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3.5 py-2 text-sm"
          style={{
            background: "var(--color-accent)",
            borderColor: "var(--color-accent)",
            color: "var(--color-bg)",
          }}
        >
          <Plus size={15} strokeWidth={1.5} />
          New group
        </button>
      </div>

      {!!failure && <ErrorAlert error={failure} title="Could not load groups." />}

      {invites.length > 0 && (
        <section className="bp grid gap-3 p-4.5">
          <p className="eyebrow">
            {invites.length} pending{" "}
            {invites.length === 1 ? "invite" : "invites"}
          </p>
          {invites.map((invite) => (
            <div
              key={invite._id}
              className="flex flex-wrap items-center gap-2.5"
            >
              <span className="text-[13.5px]">
                {typeof invite.group === "string"
                  ? "A group"
                  : invite.group.name}{" "}
                <span className="opacity-55">
                  · invited by {refName(invite.invitedBy)}
                </span>
              </span>
              <span className="flex-1" />
              <button
                type="button"
                className="action-btn"
                data-active
                style={{ padding: "6px 14px" }}
                onClick={() => respondToInvite(invite, true)}
              >
                Accept
              </button>
              <button
                type="button"
                className="rounded-[10px] border border-[var(--color-divider)] px-3.5 py-1.5 text-[13px]"
                onClick={() => respondToInvite(invite, false)}
              >
                Decline
              </button>
            </div>
          ))}
        </section>
      )}

      <div
        className="grid items-start gap-[18px]"
        style={{
          gridTemplateColumns: narrow
            ? "1fr"
            : "minmax(0, 1.4fr) minmax(300px, 1fr)",
        }}
      >
        {showList && (
          <div className="grid min-w-0 content-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {loading && groups.length === 0 ? (
              <ListCardsSkeleton count={4} titleHeight={17} />
            ) : visible.length === 0 ? (
              <div className="bp grid place-items-center gap-2 p-8 text-center">
                <Layers
                  size={22}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p className="m-0 text-[13.5px] opacity-60">
                  {query ? "No groups match." : "You're not in any groups yet."}
                </p>
              </div>
            ) : (
              visible.map((group) => {
                const admin = (group.admins ?? []).some(
                  (a) => refId(a) === user?._id
                )
                return (
                  <button
                    key={group._id}
                    type="button"
                    className="list-card"
                    data-active={group._id === activeId}
                    onClick={() => {
                      setActiveId(group._id)
                      setTab("members")
                      setShowDetailOnNarrow(true)
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {admin && <span className="pill pill-outline">Admin</span>}
                      <span
                        className="ml-auto text-[11px]"
                        style={{
                          color:
                            "color-mix(in srgb, var(--color-text) 45%, transparent)",
                        }}
                      >
                        Active {relativeTime(group.updatedAt)}
                      </span>
                    </span>
                    <span
                      className="text-[18px] leading-[1.15]"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      {group.name}
                    </span>
                    <span
                      className="line-clamp-2 text-[12.5px] leading-[1.5]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 60%, transparent)",
                      }}
                    >
                      {group.description || "No description yet."}
                    </span>
                    <span
                      className="flex items-center gap-3 text-[11.5px]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-text) 52%, transparent)",
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={13} strokeWidth={1.5} />
                        {group.members?.length ?? 0} members
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}

        {showDetail && (
          <section className="bp flex min-w-0 flex-col self-start">
            {!active ? (
              <div className="grid place-items-center gap-3 p-12 text-center">
                <Layers
                  size={26}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-accent)" }}
                />
                <p
                  className="m-0 text-[17px]"
                  style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                >
                  Pick a group
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-2.5 border-b border-[var(--color-divider)] px-4.5 py-4">
                  {narrow && (
                    <button
                      type="button"
                      onClick={() => setShowDetailOnNarrow(false)}
                      className="flex w-fit items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px]"
                    >
                      <ArrowLeft size={15} strokeWidth={1.5} />
                      Groups
                    </button>
                  )}
                  <h2
                    className="m-0 text-[21px] leading-[1.15]"
                    style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                  >
                    {active.name}
                  </h2>
                  <p
                    className="m-0 text-[13px]"
                    style={{
                      color:
                        "color-mix(in srgb, var(--color-text) 60%, transparent)",
                    }}
                  >
                    {active.description || "No description yet."}
                  </p>
                  <div className="seg-group w-fit">
                    {(["members", "details"] as GroupTab[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="seg-btn"
                        data-active={tab === option}
                        onClick={() => setTab(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {tab === "members" ? (
                  <div>
                    <div className="flex items-center gap-2.5 border-b border-[var(--color-divider)] px-4.5 py-3">
                      <span className="eyebrow">
                        {active.members?.length ?? 0} members
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setInviteOpen(true)}
                          className="ml-auto flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--color-accent)]"
                        >
                          <UserPlus size={14} strokeWidth={1.5} />
                          Invite
                        </button>
                      )}
                    </div>

                    {(active.members ?? []).map((member) => {
                      const id = refId(member)
                      const name = refName(member)
                      const memberIsAdmin = (active.admins ?? []).some(
                        (a) => refId(a) === id
                      )
                      return (
                        <div
                          key={id ?? name}
                          className="hover-row flex items-center gap-2.5 border-b px-4.5 py-3"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--color-text) 8%, transparent)",
                          }}
                        >
                          <span className="avatar-plain h-[30px] w-[30px] flex-none text-[11px]">
                            {initialsOf(name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate text-[13.5px] font-medium">
                              {name}
                              {id === user?._id && (
                                <span className="opacity-50"> (you)</span>
                              )}
                            </p>
                            <p
                              className="m-0 mt-px text-[11.5px]"
                              style={{
                                color:
                                  "color-mix(in srgb, var(--color-text) 50%, transparent)",
                              }}
                            >
                              {memberIsAdmin ? "Admin" : "Member"}
                            </p>
                          </div>
                          {memberIsAdmin && (
                            <span className="pill pill-accent">Admin</span>
                          )}
                          {isAdmin && id && (
                            <>
                              {memberIsAdmin ? (
                                // An admin may step down themselves; the API
                                // refuses if they are the last one left.
                                <button
                                  type="button"
                                  onClick={() => demote(id, name)}
                                  className="whitespace-nowrap text-[11.5px]"
                                  style={{ color: "var(--color-accent-800)" }}
                                >
                                  {id === user?._id ? "Step down" : "Demote"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => promote(id)}
                                  className="whitespace-nowrap text-[11.5px]"
                                  style={{ color: "var(--color-accent-700)" }}
                                >
                                  Promote
                                </button>
                              )}
                              {id !== user?._id && (
                                <IconButton
                                  title={`Remove ${name}`}
                                  onClick={() => removeMember(id, name)}
                                  className="h-7 w-7"
                                >
                                  <X size={13} strokeWidth={1.5} />
                                </IconButton>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3.5 px-4.5 py-4">
                    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
                      <div>
                        <p className="eyebrow">Created</p>
                        <p className="m-0 mt-[3px] text-sm">
                          {relativeTime(active.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="eyebrow">Last activity</p>
                        <p className="m-0 mt-[3px] text-sm">
                          {relativeTime(active.updatedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="eyebrow">Members</p>
                        <p className="m-0 mt-[3px] text-sm">
                          {active.members?.length ?? 0}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="eyebrow">Admins</p>
                      <p className="m-0 mt-[3px] text-sm">
                        {(active.admins ?? [])
                          .map((admin) => refName(admin))
                          .join(", ") || "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-[var(--color-divider)] pt-3">
                      <button
                        type="button"
                        onClick={leaveGroup}
                        className="flex items-center gap-1.5 rounded-[10px] border border-[var(--color-divider)] px-3.5 py-2 text-[13px]"
                      >
                        <LogOut size={14} strokeWidth={1.5} />
                        Leave group
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={deleteGroup}
                          className="flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-[13px]"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--color-danger) 55%, transparent)",
                            color: "var(--color-danger)",
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                          Delete group
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {createOpen && (
        <CreateGroupModal
          onClose={() => setCreateOpen(false)}
          onCreated={(group) => {
            mutateCache<Group[]>(keys.groups(), (current) => [
              group,
              ...current,
            ])
            invalidate(...DASHBOARD_SCOPES)
            setActiveId(group._id)
            setShowDetailOnNarrow(true)
            toast.success("Group created")
          }}
        />
      )}

      {inviteOpen && active && (
        <InviteModal
          group={active}
          existing={(active.members ?? [])
            .map((m) => refId(m))
            .filter(Boolean) as string[]}
          onClose={() => setInviteOpen(false)}
          onInvited={() => void reloadActive()}
        />
      )}
    </div>
  )
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (group: Group) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setError(null)
    try {
      const group = await groupsApi.create({
        name: trimmed,
        description: description.trim(),
      })
      onCreated(group)
      onClose()
    } catch (caught) {
      setError(
        errorMessage(caught, "Could not create the group.")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      kicker="Groups"
      title="Create a group"
      onClose={onClose}
      footer={
        <>
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
            data-active={!!name.trim() && !saving}
            disabled={!name.trim() || saving}
            onClick={save}
          >
            {saving ? "Creating…" : "Create group"}
          </button>
        </>
      }
    >
      <label className="field-label">
        Name
        <input
          autoFocus
          className="field-input h-10"
          placeholder="e.g. Algorithms Reading Circle"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save()
          }}
        />
      </label>
      <label className="field-label">
        Description
        <textarea
          className="field-input text-[13.5px]"
          style={{ minHeight: 110 }}
          placeholder="A sentence or two of context"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error && (
        <InlineError>{error}</InlineError>
      )}
    </Modal>
  )
}

function InviteModal({
  group,
  existing,
  onClose,
  onInvited,
}: {
  group: Group
  existing: string[]
  onClose: () => void
  onInvited: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      usersApi
        .search(query.trim() || undefined)
        .then((data) => {
          if (!cancelled)
            setResults(data.filter((person) => !existing.includes(person._id)))
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, existing])

  async function invite(person: User) {
    setPending(person._id)
    try {
      // The API either adds them outright or sends an invite, depending on
      // their `whoCanAddMeToGroup` setting — surface whichever happened.
      const result = await groupsApi.addMember(group._id, person._id)
      toast.success(result.message)
      setResults((current) => current.filter((p) => p._id !== person._id))
      onInvited()
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not invite them.")
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <Modal
      kicker="Members"
      title="Invite a member"
      subtitle={group.name}
      onClose={onClose}
      bodyClassName="grid content-start gap-1.5 pb-[22px]"
    >
      <div
        className="sticky top-0 z-10 pb-3 pt-[22px]"
        style={{ background: "var(--color-bg)" }}
      >
        <input
          autoFocus
          className="field-input h-10"
          placeholder="Search people by name or email…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div>
        {loading ? (
          <PeopleRowsSkeleton count={4} />
        ) : results.length === 0 ? (
          <p className="m-0 py-6 text-center text-[13px] opacity-50">
            No one left to invite.
          </p>
        ) : (
          results.map((person) => (
            <div
              key={person._id}
              className="hover-row flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <span className="avatar-mono h-8 w-8 text-[11px]">
                {initialsOf(person.username)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">
                  {person.username}
                </span>
                <span
                  className="block truncate text-[11.5px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 50%, transparent)",
                  }}
                >
                  {person.email}
                </span>
              </span>
              <button
                type="button"
                className="action-btn"
                data-active={pending !== person._id}
                disabled={pending === person._id}
                style={{ padding: "6px 14px" }}
                onClick={() => invite(person)}
              >
                {pending === person._id ? "…" : "Invite"}
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}

