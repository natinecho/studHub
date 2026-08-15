/**
 * Cache keys, in one place.
 *
 * A write on one screen usually invalidates a read on another — creating a
 * note changes the notes list *and* the dashboard's stats and activity feed.
 * Keeping the keys together is what makes those relationships checkable rather
 * than a matter of remembering to type the same string twice.
 *
 * Each `SCOPE` is the coarse name `invalidate()` matches on; the functions
 * below build the parameterised keys underneath it.
 */

import { qk } from "./cache"

export const SCOPES = {
  stats: "dashboard:stats",
  activity: "dashboard:activity",
  todos: "todos",
  notes: "notes",
  note: "note",
  posts: "posts",
  post: "post",
  comments: "comments",
  groups: "groups",
  invites: "groups:invites",
  conversations: "chat:conversations",
  messages: "chat:messages",
} as const

export const keys = {
  stats: () => SCOPES.stats,
  activity: () => SCOPES.activity,
  todos: () => SCOPES.todos,

  notes: (params: { search?: string; type?: string }) =>
    qk(SCOPES.notes, params),
  note: (id: string) => qk(SCOPES.note, id),

  posts: (params: {
    search?: string
    myPosts?: boolean
    favourites?: boolean
  }) => qk(SCOPES.posts, params),
  post: (id: string) => qk(SCOPES.post, id),
  comments: (postId: string) => qk(SCOPES.comments, postId),

  groups: () => SCOPES.groups,
  invites: () => SCOPES.invites,

  conversations: () => SCOPES.conversations,
  messages: (threadId: string) => qk(SCOPES.messages, threadId),
}

/**
 * What the dashboard derives from. Notes, tasks, posts and groups all feed the
 * stat cards and the activity feed, so every mutation refreshes these too.
 */
export const DASHBOARD_SCOPES = [SCOPES.stats, SCOPES.activity]
