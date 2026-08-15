"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { IconButton } from "@/components/icon-button"
import { PasswordInput } from "@/components/password-input"
import { errorMessage, usersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { initialsOf } from "@/lib/format"

type SettingsTab = "profile" | "notifications" | "privacy" | "preferences"

const TABS: [SettingsTab, string][] = [
  ["profile", "Profile"],
  ["notifications", "Notifications"],
  ["privacy", "Privacy"],
  ["preferences", "Preferences"],
]

/** Preferences the API has no field for are kept in localStorage. */
const LOCAL_KEY = "studenthub.preferences"

interface LocalPreferences {
  emailDigest: boolean
  push: boolean
  forumReplies: boolean
  groupMessages: boolean
  taskReminders: boolean
  language: string
  timezone: string
}

const DEFAULT_PREFERENCES: LocalPreferences = {
  emailDigest: true,
  push: true,
  forumReplies: true,
  groupMessages: false,
  taskReminders: true,
  language: "English",
  timezone: "GMT+3 East Africa",
}

/**
 * The notification switches remember what you chose, but nothing acts on them
 * yet — there is no digest job, no push subscription and no reply hook in the
 * API. Rather than leave a switch that appears to do something, say so.
 *
 * A fixed id means flipping several in a row replaces the toast instead of
 * stacking five of them up the corner of the screen.
 */
function announceComingSoon() {
  toast("Coming soon", {
    id: "notifications-coming-soon",
    description: "Notification delivery isn't built yet — your choice is saved for when it is.",
  })
}

function readPreferences(): LocalPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    return raw
      ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as LocalPreferences) }
      : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3.5 border-t border-[var(--color-divider)] py-3.5">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-medium">{label}</p>
        <p
          className="m-0 mt-0.5 text-xs"
          style={{
            color: "color-mix(in srgb, var(--color-text) 52%, transparent)",
          }}
        >
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch-track"
        data-active={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  )
}

export function Settings({ narrow }: { narrow: boolean }) {
  const { user, patchUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const [tab, setTab] = useState<SettingsTab>("profile")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const [openToGroups, setOpenToGroups] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [prefs, setPrefs] = useState<LocalPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    setPrefs(readPreferences())
  }, [])

  useEffect(() => {
    if (!user) return
    setUsername(user.username ?? "")
    setBio(user.bio ?? "")
    setOpenToGroups(!!user.whoCanAddMeToGroup)
  }, [user])

  function updatePrefs(patch: Partial<LocalPreferences>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
    } catch {
      // Storage may be unavailable in private mode — not worth failing over.
    }
  }

  async function saveProfile() {
    if (savingProfile) return
    setSavingProfile(true)
    try {
      const result = await usersApi.updateProfile({
        username: username.trim() || undefined,
        bio,
      })
      patchUser(result.user)
      toast.success(result.message || "Profile updated")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not save your profile.")
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePrivacy() {
    if (savingPrivacy) return
    setSavingPrivacy(true)
    try {
      const result = await usersApi.updateProfile({
        whoCanAddMeToGroup: openToGroups,
      })
      patchUser(result.user)
      toast.success("Privacy settings saved")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not save your privacy settings.")
      )
    } finally {
      setSavingPrivacy(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || changingPassword) return
    setChangingPassword(true)
    try {
      const result = await usersApi.changePassword({
        password: currentPassword,
        newPassword,
      })
      toast.success(result.message || "Password changed")
      setCurrentPassword("")
      setNewPassword("")
    } catch (caught) {
      toast.error(
        errorMessage(caught, "Could not change your password.")
      )
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div
      className="animate-rise-in grid max-w-[1100px] items-start"
      style={{
        gridTemplateColumns: narrow ? "1fr" : "200px minmax(0, 1fr)",
        // Tighter on narrow: the strip and the panel below it are one unit,
        // and a 20px trench between them just reads as a gap in the page.
        gap: narrow ? 14 : 20,
      }}
    >
      {/* Narrow and wide are genuinely different controls, not one control
          reflowed: a column of full-width rows costs a third of a phone screen
          before the settings even start, so on narrow it becomes a single
          scrolling row of pills and Log out moves out of the tab list — it is
          an action, and putting it inline invites a mis-tap while swiping. */}
      {narrow ? (
        <nav className="flex min-w-0 items-center gap-2">
          <div
            className="tab-strip min-w-0 flex-1 border-b-0 pb-0"
            role="tablist"
            aria-label="Settings sections"
          >
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className="vtab"
                data-active={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <IconButton title="Log out" onClick={logout}>
            <LogOut size={15} strokeWidth={1.5} />
          </IconButton>
        </nav>
      ) : (
        <nav className="flex min-w-0 flex-col content-start gap-[3px]">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="vtab"
              data-active={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="vtab mt-2"
            style={{ color: "var(--color-accent-800)" }}
            onClick={logout}
          >
            <LogOut size={15} strokeWidth={1.5} className="mr-2" />
            Log out
          </button>
        </nav>
      )}

      <div className="settings-panel flex min-w-0 max-w-[760px] flex-col gap-[18px]">
        {tab === "profile" && (
          <section className="bp grid gap-[18px] p-5">
            <div>
              <h2
                className="m-0 text-[21px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Profile
              </h2>
              <p
                className="m-0 mt-[3px] text-[13px]"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                Your personal details
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-divider)] pb-[18px]">
              <span className="avatar-mono h-[72px] w-[72px] text-2xl">
                {initialsOf(user?.username)}
              </span>
              <div className="grid gap-1.5">
                <p className="m-0 text-[15px] font-medium">{user?.username}</p>
                <span
                  className="text-[11.5px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 50%, transparent)",
                  }}
                >
                  Member since{" "}
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>

            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <label className="field-label">
                Username
                <input
                  className="field-input h-[38px]"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label className="field-label">
                Email
                <input
                  className="field-input h-[38px]"
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  title="Email cannot be changed"
                />
              </label>
            </div>

            <label className="field-label">
              Bio
              <textarea
                className="field-input text-[13.5px]"
                style={{ minHeight: 76 }}
                placeholder="Computer Science student passionate about AI."
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                className="action-btn"
                data-active={!savingProfile}
                disabled={savingProfile}
                onClick={saveProfile}
              >
                {savingProfile ? "Saving…" : "Save changes"}
              </button>
            </div>
          </section>
        )}

        {tab === "notifications" && (
          <section className="bp grid gap-1.5 p-5">
            <div className="mb-3">
              <h2
                className="m-0 text-[21px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Notifications
              </h2>
              <p
                className="m-0 mt-[3px] text-[13px]"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                Coming soon — saved on this device, but nothing sends yet
              </p>
            </div>

            <Toggle
              label="Email notifications"
              description="A daily digest of what changed"
              checked={prefs.emailDigest}
              onChange={(next) => {
                updatePrefs({ emailDigest: next })
                announceComingSoon()
              }}
            />
            <Toggle
              label="Push notifications"
              description="Browser alerts while you are online"
              checked={prefs.push}
              onChange={(next) => {
                updatePrefs({ push: next })
                announceComingSoon()
              }}
            />
            <Toggle
              label="Forum replies"
              description="When someone answers your post"
              checked={prefs.forumReplies}
              onChange={(next) => {
                updatePrefs({ forumReplies: next })
                announceComingSoon()
              }}
            />
            <Toggle
              label="Group messages"
              description="Every message in group chats"
              checked={prefs.groupMessages}
              onChange={(next) => {
                updatePrefs({ groupMessages: next })
                announceComingSoon()
              }}
            />
            <Toggle
              label="Task reminders"
              description="A nudge the day before a deadline"
              checked={prefs.taskReminders}
              onChange={(next) => {
                updatePrefs({ taskReminders: next })
                announceComingSoon()
              }}
            />
          </section>
        )}

        {tab === "privacy" && (
          <>
            <section className="bp grid gap-4 p-5">
              <div>
                <h2
                  className="m-0 text-[21px]"
                  style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                >
                  Privacy
                </h2>
                <p
                  className="m-0 mt-[3px] text-[13px]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-text) 55%, transparent)",
                  }}
                >
                  Who can reach you
                </p>
              </div>

              <label className="field-label">
                Who can add me to groups
                <select
                  className="field-input h-[38px]"
                  value={openToGroups ? "anyone" : "invite"}
                  onChange={(event) =>
                    setOpenToGroups(event.target.value === "anyone")
                  }
                >
                  <option value="anyone">
                    Anyone — add me straight away
                  </option>
                  <option value="invite">
                    Invite only — ask me first
                  </option>
                </select>
              </label>

              <button
                type="button"
                className="action-btn w-fit"
                data-active={!savingPrivacy}
                disabled={savingPrivacy}
                onClick={savePrivacy}
              >
                {savingPrivacy ? "Saving…" : "Save settings"}
              </button>
            </section>

            <section className="bp grid gap-4 p-5">
              <div>
                <h3
                  className="m-0 text-[17px]"
                  style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
                >
                  Change password
                </h3>
              </div>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                <label className="field-label">
                  Current password
                  <PasswordInput
                    className="field-input h-[38px]"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  New password
                  <PasswordInput
                    className="field-input h-[38px]"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="action-btn w-fit"
                data-active={
                  !!currentPassword && !!newPassword && !changingPassword
                }
                disabled={!currentPassword || !newPassword || changingPassword}
                onClick={changePassword}
              >
                {changingPassword ? "Updating…" : "Update password"}
              </button>
            </section>
          </>
        )}

        {tab === "preferences" && (
          <section className="bp grid gap-4 p-5">
            <div>
              <h2
                className="m-0 text-[21px]"
                style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}
              >
                Preferences
              </h2>
              <p
                className="m-0 mt-[3px] text-[13px]"
                style={{
                  color:
                    "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                Language, time and appearance
              </p>
            </div>

            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <label className="field-label">
                Theme
                <select
                  className="field-input h-[38px]"
                  value={theme ?? "system"}
                  onChange={(event) => setTheme(event.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="field-label">
                Language
                <select
                  className="field-input h-[38px]"
                  value={prefs.language}
                  onChange={(event) =>
                    updatePrefs({ language: event.target.value })
                  }
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>Amharic</option>
                </select>
              </label>
              <label className="field-label">
                Timezone
                <select
                  className="field-input h-[38px]"
                  value={prefs.timezone}
                  onChange={(event) =>
                    updatePrefs({ timezone: event.target.value })
                  }
                >
                  <option>GMT+3 East Africa</option>
                  <option>GMT+0 London</option>
                  <option>UTC-5 Eastern</option>
                  <option>UTC-8 Pacific</option>
                </select>
              </label>
            </div>

            <p
              className="m-0 text-xs"
              style={{
                color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
              }}
            >
              Theme applies immediately. Language and timezone are stored on
              this device.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
