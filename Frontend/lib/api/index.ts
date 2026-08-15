// Typed bindings for every route mounted in Api/app.js.

import { request, requestBlob, ApiError } from "./client"
import type {
  ActivityItem,
  AIChatResult,
  AIChatTurn,
  AuthUser,
  Comment,
  Conversation,
  Group,
  GroupInvite,
  Id,
  Message,
  Note,
  NoteFilters,
  NoteSummary,
  Post,
  PostPage,
  Priority,
  SharedNote,
  Statistics,
  Todo,
  TodoInput,
  User,
  VoteValue,
} from "./types"

export * from "./types"
export { ApiError, API_BASE_URL, getToken, setToken } from "./client"
export { errorMessage, isAuthError, isNetworkError } from "./errors"
export {
  useQuery,
  qk,
  invalidate,
  mutateCache,
  fetchQuery,
  clearCache,
  type QueryOptions,
  type QueryResult,
} from "./cache"
export { keys, SCOPES, DASHBOARD_SCOPES } from "./keys"

// ── Users — /api/users ──────────────────────────────────────────────────────

export const usersApi = {
  register: (input: { username: string; email: string; password: string }) =>
    request<AuthUser>("/api/users/register", {
      method: "POST",
      body: input,
      anonymous: true,
    }),

  login: (input: { email: string; password: string }) =>
    request<AuthUser>("/api/users/login", {
      method: "POST",
      body: input,
      anonymous: true,
    }),

  me: () => request<User>("/api/users/me"),

  updateProfile: (input: {
    username?: string
    bio?: string
    profile_pic?: string
    whoCanAddMeToGroup?: boolean
  }) =>
    request<{ message: string; user: User }>("/api/users/me", {
      method: "PUT",
      body: input,
    }),

  search: (search?: string, limit = 20) =>
    request<User[]>("/api/users", { query: { search, limit } }),

  toggleFavourite: (postId: Id) =>
    request<{ message: string; isFavourites: boolean }>(
      `/api/users/fav/${postId}`,
      { method: "POST" }
    ),

  // The controller reads `password` (current) and `newPassword`.
  changePassword: (input: { password: string; newPassword: string }) =>
    request<{ message: string }>("/api/users/change-password", {
      method: "PUT",
      body: input,
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/users/forget-password", {
      method: "POST",
      body: { email },
      anonymous: true,
    }),

  resetPassword: (input: { token: string; newPassword: string }) =>
    request<{ message: string }>("/api/users/reset-password", {
      method: "PUT",
      body: input,
      anonymous: true,
    }),
}

// ── Notes — /api/notes ──────────────────────────────────────────────────────

export const notesApi = {
  list: (filters: NoteFilters = {}) =>
    request<NoteSummary[]>("/api/notes", { query: { ...filters } }),

  get: (id: Id) => request<Note>(`/api/notes/${id}`),

  create: (input: {
    title: string
    content: string
    type?: "personal" | "group"
    group?: Id
    tags?: string[]
  }) =>
    request<{ message: string; note: Note }>("/api/notes", {
      method: "POST",
      body: input,
    }).then((r) => r.note),

  // PATCH — the backend uses it for partial updates and auto-save.
  update: (
    id: Id,
    input: Partial<{
      title: string
      content: string
      tags: string[]
      type: "personal" | "group"
      groupId: Id
    }>
  ) => request<Note>(`/api/notes/${id}`, { method: "PATCH", body: input }),

  remove: (id: Id) =>
    request<{ message: string }>(`/api/notes/${id}`, { method: "DELETE" }),

  /**
   * Returns the note's existing share link, or mints one the first time.
   * `regenerate` asks for a fresh link, which invalidates the previous one —
   * so it is only ever sent deliberately.
   */
  share: (id: Id, regenerate = false) =>
    request<{
      message: string
      shareUrl: string
      shareLink: string
      created: boolean
    }>(`/api/notes/${id}/share`, {
      method: "POST",
      body: { regenerate },
    }),

  /** Stops sharing: every copy of the old URL 404s afterwards. */
  unshare: (id: Id) =>
    request<{ message: string }>(`/api/notes/${id}/share`, {
      method: "DELETE",
    }),

  // Public: the endpoint takes an optional token, so this works signed out too.
  getByShareLink: (shareLink: string) =>
    request<SharedNote>(`/api/notes/share/${shareLink}`),

  exportPdf: (id: Id) => requestBlob(`/api/notes/${id}/export`),
}

// ── Todos — /api/todos ──────────────────────────────────────────────────────

export const todosApi = {
  list: (
    filters: {
      priority?: Priority
      completed?: boolean
      type?: "personal" | "group"
      sortBy?: "deadline" | "priority"
    } = {}
  ) => request<Todo[]>("/api/todos", { query: { ...filters } }),

  get: (id: Id) => request<Todo>(`/api/todos/${id}`),

  create: (input: TodoInput) =>
    request<{ message: string; ToDo: Todo }>("/api/todos", {
      method: "POST",
      body: input,
    }).then((r) => r.ToDo),

  update: (id: Id, input: Partial<TodoInput>) =>
    request<Todo>(`/api/todos/${id}`, { method: "PUT", body: input }),

  remove: (id: Id) =>
    request<{ message: string }>(`/api/todos/${id}`, { method: "DELETE" }),

  toggle: (id: Id) =>
    request<{ message: string }>(`/api/todos/${id}/completed`, {
      method: "PATCH",
    }),
}

// ── Forum — /api/posts and /api/comments ────────────────────────────────────

export const postsApi = {
  list: (
    filters: {
      search?: string
      favourites?: boolean
      myPosts?: boolean
      page?: number
      limit?: number
    } = {}
  ) => request<PostPage>("/api/posts", { query: { ...filters } }),

  get: (id: Id) => request<Post>(`/api/posts/${id}`),

  create: (input: { title: string; content: string; tags?: string[] }) =>
    request<Post>("/api/posts", { method: "POST", body: input }),

  update: (
    id: Id,
    input: Partial<{ title: string; content: string; tags: string[] }>
  ) => request<Post>(`/api/posts/${id}`, { method: "PUT", body: input }),

  remove: (id: Id) =>
    request<{ message: string }>(`/api/posts/${id}`, { method: "DELETE" }),

  like: (id: Id) =>
    request<{ message: string; isLiked: boolean; likeCount: number }>(
      `/api/posts/${id}/like`,
      { method: "POST" }
    ),
}

export const commentsApi = {
  listForPost: (postId: Id) =>
    request<{ comments: Comment[] }>(`/api/comments/${postId}`)
      .then((r) => r.comments ?? [])
      // Older deployments answered 404 for an empty thread.
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return []
        throw error
      }),

  create: (input: { post: Id; content: string; parentComment?: Id }) =>
    request<Comment>("/api/comments", { method: "POST", body: input }),

  update: (id: Id, input: { content: string; post?: Id; parentComment?: Id }) =>
    request<Comment>(`/api/comments/${id}`, { method: "PUT", body: input }),

  remove: (id: Id) =>
    request<{ message: string }>(`/api/comments/${id}`, { method: "DELETE" }),

  // Sending the vote you already cast clears it, so the caller does not have
  // to special-case "un-vote" — it is the same request either way.
  vote: (id: Id, vote: 1 | -1) =>
    request<{
      message: string
      upvotes: number
      downvotes: number
      myVote: VoteValue
    }>(`/api/comments/${id}/vote`, { method: "POST", body: { vote } }),
}

// ── Groups — /api/groups ────────────────────────────────────────────────────

export const groupsApi = {
  list: () => request<Group[]>("/api/groups"),

  get: (id: Id) => request<Group>(`/api/groups/${id}`),

  create: (input: { name: string; description?: string }) =>
    request<Group>("/api/groups", { method: "POST", body: input }),

  update: (id: Id, input: { name?: string; description?: string }) =>
    request<Group>(`/api/groups/${id}`, { method: "PUT", body: input }),

  remove: (id: Id) =>
    request<{ message: string }>(`/api/groups/${id}`, { method: "DELETE" }),

  addMember: (groupId: Id, userId: Id) =>
    request<{ message: string }>(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: { userId },
    }),

  removeMember: (groupId: Id, userId: Id) =>
    request<{ message: string }>(
      `/api/groups/${groupId}/members/${userId}`,
      { method: "DELETE" }
    ),

  promote: (groupId: Id, userId: Id) =>
    request<{ message: string }>(`/api/groups/${groupId}/promote/${userId}`, {
      method: "POST",
    }),

  demote: (groupId: Id, userId: Id) =>
    request<{ message: string }>(`/api/groups/${groupId}/demote/${userId}`, {
      method: "POST",
    }),

  leave: (groupId: Id) =>
    request<{ message: string }>(`/api/groups/${groupId}/leave`, {
      method: "POST",
    }),

  myInvites: () => request<GroupInvite[]>("/api/groups/me/invites"),

  acceptInvite: (inviteId: Id) =>
    request<{ message: string }>(`/api/groups/invites/${inviteId}/accept`, {
      method: "POST",
    }),

  declineInvite: (inviteId: Id) =>
    request<{ message: string }>(`/api/groups/invites/${inviteId}/decline`, {
      method: "POST",
    }),
}

// ── Chat — /api/chat ────────────────────────────────────────────────────────

export const chatApi = {
  conversations: () => request<Conversation[]>("/api/chat/conversation"),

  messagesForConversation: (id: Id) =>
    request<Message[]>(`/api/chat/conversation/${id}`),

  messagesForGroup: (id: Id) => request<Message[]>(`/api/chat/group/${id}`),
}

// ── AI — /api/ai ────────────────────────────────────────────────────────────

export const aiApi = {
  // `history` must always be an array — the controller calls .slice() on it.
  chat: (message: string, history: AIChatTurn[] = []) =>
    request<{ success: boolean; data: AIChatResult }>("/api/ai/chat", {
      method: "POST",
      body: { message, history },
    }).then((r) => r.data),

  summarizeNote: (noteId: Id) =>
    request<{ success: boolean; data: { summary: string } }>(
      `/api/ai/summarize/${noteId}`,
      { method: "POST" }
    ).then((r) => r.data.summary),
}

// ── Dashboard — /api/dashboard ──────────────────────────────────────────────

export const dashboardApi = {
  statistics: () =>
    request<{ success: boolean; data: Statistics }>(
      "/api/dashboard/statistics"
    ).then((r) => r.data),

  recentActivity: () =>
    request<{ success: boolean; data: ActivityItem[] }>(
      "/api/dashboard/recent"
    ).then((r) => r.data),
}
