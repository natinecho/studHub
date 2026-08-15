// Shapes returned by the Express API in ../../Api.
// Field names here mirror the backend exactly — including its own spellings
// (e.g. `discription`, `deadline`) — so the mapping stays honest.

export type Id = string

export interface AuthUser {
  _id: Id
  username: string
  email: string
  token: string
}

export interface User {
  _id: Id
  username: string
  email: string
  bio?: string
  profile_pic?: string
  favourites?: Id[]
  whoCanAddMeToGroup?: boolean
  createdAt?: string
  updatedAt?: string
}

/** A user as embedded in populated documents. */
export interface UserRef {
  _id: Id
  username: string
  profile_pic?: string
}

// ── Notes ───────────────────────────────────────────────────────────────────

export type NoteType = "personal" | "group"

/** Full note, from GET /api/notes/:id */
export interface Note {
  _id: Id
  user: Id | UserRef
  title: string
  content: string
  type: NoteType
  collaborators?: Id[]
  group?: Id | null
  tags: string[]
  shareLink?: string
  createdAt: string
  updatedAt: string
}

/** List projection from GET /api/notes — content is stripped, snippet added. */
export interface NoteSummary {
  _id: Id
  user: UserRef
  title: string
  type: NoteType
  tags: string[]
  group?: Id | null
  snippet: string
  no_contributors?: number
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/notes/share/:shareLink — anyone with the link gets a read-only
 * projection keyed `id`; the owner and group members get the whole document
 * back instead, which is why the document-only fields are optional here.
 */
export interface SharedNote {
  id?: Id
  _id?: Id
  title: string
  content: string
  type: NoteType
  tags: string[]
  user?: Id | UserRef
  group?: Id | null
  collaborators?: Id[]
  shareLink?: string
  createdAt: string
  updatedAt: string
}

export interface NoteFilters {
  search?: string
  type?: NoteType
  tags?: string
  startDate?: string
  endDate?: string
}

// ── Todos ───────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high"

export interface TodoCompletion {
  user: Id
  status: boolean
}

export interface Todo {
  _id: Id
  user: Id
  title: string
  /** Backend spelling. */
  discription?: string
  category?: string
  priority: Priority
  type: NoteType
  group?: Id | { _id: Id; name: string } | null
  assignedMembers: (Id | UserRef)[]
  deadline?: string
  completions: TodoCompletion[]
  /** Added by the API for the requesting user. */
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface TodoInput {
  title: string
  discription?: string
  category?: string
  priority: Priority
  type: NoteType
  /** null clears an existing due date; undefined leaves it untouched. */
  deadline?: string | null
  groupId?: Id
  assignedMembers?: Id[]
}

// ── Forum ───────────────────────────────────────────────────────────────────

export interface Post {
  _id: Id
  user: UserRef
  title: string
  content: string
  tags: string[]
  likes: Id[]
  isFavourite: boolean
  isLiked: boolean
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
}

export interface PostPage {
  posts: Post[]
  page: number
  totalPages: number
  totalCount: number
}

export interface Comment {
  _id: Id
  user: UserRef
  post: Id
  /** null for a top-level reply; the id of the reply this answers otherwise. */
  parentComment?: Id | null
  content: string
  upvotes: number
  downvotes: number
  /** How the requesting user voted: 1 up, -1 down, 0 not yet. */
  myVote?: VoteValue
  createdAt: string
  updatedAt: string
}

export type VoteValue = 1 | -1 | 0

/** A comment with its answers attached — the shape the thread renders from. */
export interface CommentNode extends Comment {
  replies: CommentNode[]
  /** Replies at every level below this one, for the "3 replies" toggle. */
  descendantCount: number
  /** 0 for a top-level reply, 1 for an answer to it, and so on. */
  depth: number
}

// ── Groups ──────────────────────────────────────────────────────────────────

export interface Group {
  _id: Id
  name: string
  description: string
  createdBy: Id | UserRef
  members: (Id | UserRef)[]
  admins: (Id | UserRef)[]
  createdAt: string
  updatedAt: string
}

export interface GroupInvite {
  _id: Id
  group: Id | Group
  invitedUser: Id | UserRef
  invitedBy?: Id | UserRef
  status?: string
  createdAt?: string
}

// ── Chat ────────────────────────────────────────────────────────────────────

/** Unified row from GET /api/chat/conversation. */
export type Conversation =
  | {
      _id: Id
      kind: "direct"
      name: string
      peerId: Id | null
      profile_pic: string
      lastMessage: string
      updatedAt: string
      /** Messages from the other person this user hasn't been shown yet. */
      unreadCount: number
    }
  | {
      _id: Id
      kind: "group"
      name: string
      memberCount: number
      lastMessage: string
      updatedAt: string
      unreadCount: number
    }

/** The quoted message shown above a reply. */
export interface MessageQuote {
  _id: Id
  content: string
  sender: Id | UserRef
  deletedAt?: string | null
}

export interface Message {
  _id: Id
  sender: Id | UserRef
  content: string
  conversation?: Id
  group?: Id
  seenBy: Id[]
  createdAt: string
  updatedAt: string
  /** Populated when this message answers another one. */
  replyTo?: MessageQuote | Id | null
  /** Set once the sender has edited the text. */
  editedAt?: string | null
  /** Soft delete — the bubble stays, the text is replaced. */
  deletedAt?: string | null
}

// ── AI ──────────────────────────────────────────────────────────────────────

export interface AIChatTurn {
  role: "user" | "model"
  text: string
}

export interface AIChatResult {
  detailed: string
  summary: string
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface StatBlock {
  total: number
  change: number
}

export interface Statistics {
  notes: { personal: number; group: number; total: number; change: number }
  posts: StatBlock
  tasks: {
    completed: { personal: number; group: number; total: number }
    assigned: number
    change: number
  }
  groups: StatBlock
}

export interface ActivityItem {
  type: string
  action: string
  title: string
  date: string
}
