// Mock API data and functions that simulate your backend endpoints
// Later, replace these with actual fetch calls to your backend

// Mock data
const mockUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", initials: "JD" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", initials: "JS" },
  { id: 3, name: "Mike Chen", email: "mike@example.com", initials: "MC" },
  { id: 4, name: "Sarah Johnson", email: "sarah@example.com", initials: "SJ" },
  { id: 5, name: "Alex Rivera", email: "alex@example.com", initials: "AR" },
]

const mockGroups = [
  {
    id: 1,
    name: "Computer Science Study Group",
    description: "Weekly discussions on algorithms, data structures, and programming concepts",
    members: 12,
    admins: ["Sarah Johnson", "Mike Chen"],
    pendingInvites: 3,
    category: "Academic",
    isAdmin: true,
    joined: "2 months ago",
    lastActivity: "2 hours ago",
  },
  {
    id: 2,
    name: "Physics Lab Partners",
    description: "Collaboration space for physics lab experiments and reports",
    members: 8,
    admins: ["Dr. Smith"],
    pendingInvites: 1,
    category: "Academic",
    isAdmin: false,
    joined: "1 month ago",
    lastActivity: "1 day ago",
  },
  {
    id: 3,
    name: "Project Alpha Team",
    description: "Final year project development and coordination",
    members: 5,
    admins: ["Alex Rivera", "Emma Wilson"],
    pendingInvites: 0,
    category: "Project",
    isAdmin: true,
    joined: "3 weeks ago",
    lastActivity: "3 hours ago",
  },
]

const mockPosts = [
  {
    id: 1,
    title: "Best practices for remote team collaboration",
    content: "What are your favorite tools and methods for keeping remote teams aligned and productive?",
    author: "Sarah Johnson",
    authorInitials: "SJ",
    time: "2 hours ago",
    likes: 15,
    comments: 8,
    tags: ["remote-work", "collaboration", "productivity"],
    pinned: true,
    category: "General",
  },
  {
    id: 2,
    title: "Project management tool recommendations",
    content: "Looking for recommendations on project management tools that work well for small teams.",
    author: "Mike Chen",
    authorInitials: "MC",
    time: "4 hours ago",
    likes: 12,
    comments: 5,
    tags: ["project-management", "tools", "recommendations"],
    pinned: false,
    category: "Tools",
  },
  {
    id: 3,
    title: "Study group formation for Computer Science",
    content: "Anyone interested in forming a study group for advanced algorithms and data structures?",
    author: "Alex Rivera",
    authorInitials: "AR",
    time: "1 day ago",
    likes: 8,
    comments: 12,
    tags: ["computer-science", "study-group", "algorithms"],
    pinned: false,
    category: "Academic",
  },
]

const mockComments = [
  {
    id: 1,
    postId: 1,
    author: "John Smith",
    authorInitials: "JS",
    content: "Great question! I've found that regular check-ins and clear communication channels are key.",
    time: "1 hour ago",
    upvotes: 3,
    downvotes: 0,
  },
  {
    id: 2,
    postId: 1,
    author: "Emma Wilson",
    authorInitials: "EW",
    content: "Slack and Trello have been game-changers for our team. The integration between them is seamless.",
    time: "45 minutes ago",
    upvotes: 5,
    downvotes: 1,
  },
]

const mockNotes = [
  {
    id: 1,
    title: "Quantum Mechanics Fundamentals",
    content: `
      <h2>Wave-Particle Duality</h2>
      <p>One of the most fundamental concepts in quantum mechanics is the wave-particle duality...</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Review Schrödinger equation</li>
        <li data-type="taskItem" data-checked="true">Study double-slit experiment</li>
        <li data-type="taskItem" data-checked="false">Practice quantum tunneling problems</li>
      </ul>
      <blockquote>
        <p>"Anyone who is not shocked by quantum theory has not understood it." - Niels Bohr</p>
      </blockquote>
    `,
    author: "John Doe",
    authorInitials: "JD",
    time: "2 hours ago",
    members: 3,
    tags: ["physics", "quantum", "theory"],
    type: "group",
    collaborators: 3,
    lastEdited: "2 minutes ago",
    views: 24,
    starred: true,
    status: "active"
  },
  {
    id: 2,
    title: "Calculus Integration Methods",
    content: `
      <h2>Integration Techniques</h2>
      <p>Various methods for solving complex integrals...</p>
      <h3>Key Methods:</h3>
      <ol>
        <li><strong>Substitution Method</strong></li>
        <li><strong>Integration by Parts</strong></li>
        <li><strong>Partial Fractions</strong></li>
      </ol>
    `,
    author: "Jane Smith",
    authorInitials: "JS",
    time: "1 day ago",
    members: 2,
    tags: ["mathematics", "calculus", "integration"],
    type: "personal",
    collaborators: 1,
    lastEdited: "1 hour ago",
    views: 18,
    starred: false,
    status: "draft"
  },
  {
    id: 3,
    title: "World War II Timeline",
    content: `
      <h2>Major Events Timeline</h2>
      <p>Comprehensive overview of WWII events from 1939-1945...</p>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true">Research Pearl Harbor attack</li>
        <li data-type="taskItem" data-checked="false">Study D-Day operations</li>
        <li data-type="taskItem" data-checked="false">Analyze post-war consequences</li>
      </ul>
    `,
    author: "Mike Chen",
    authorInitials: "MC",
    time: "3 days ago",
    members: 5,
    tags: ["history", "wwii", "timeline"],
    type: "group",
    collaborators: 5,
    lastEdited: "30 minutes ago",
    views: 42,
    starred: true,
    status: "active"
  },
]

const mockTodos = [
  {
    id: 1,
    title: "Complete Physics Assignment",
    description: "Solve problems 1-15 from chapter 8",
    priority: "high",
    category: "Academic",
    dueDate: "2024-01-15",
    completed: false,
    type: "personal",
    assignees: []
  },
  {
    id: 2,
    title: "Group Project Meeting",
    description: "Discuss project timeline and deliverables",
    priority: "medium",
    category: "Group Work",
    dueDate: "2024-01-12",
    completed: true,
    type: "group",
    assignees: ["John Doe", "Jane Smith", "Mike Chen"]
  },
  {
    id: 3,
    title: "Study for Calculus Exam",
    description: "Review integration techniques and practice problems",
    priority: "high",
    category: "Academic",
    dueDate: "2024-01-18",
    completed: false,
    type: "personal",
    assignees: []
  },
]

const mockConversations = [
  {
    id: 1,
    name: "John Doe",
    type: "direct",
    lastMessage: "Thanks for the project update!",
    time: "10:30 AM",
    unread: 0,
    online: true,
    avatar: "JD",
  },
  {
    id: 2,
    name: "Study Group - Physics",
    type: "group",
    lastMessage: "Let's schedule a review session",
    time: "Yesterday",
    unread: 3,
    online: false,
    avatar: "PH",
    members: 5,
  },
  {
    id: 3,
    name: "Project Team Alpha",
    type: "group",
    lastMessage: "Sarah: I've uploaded the latest files",
    time: "2 days ago",
    unread: 1,
    online: false,
    avatar: "PT",
    members: 4,
  },
]

const mockMessages = [
  {
    id: 1,
    conversationId: 1,
    sender: "John Doe",
    content: "Hey! How's the project going?",
    time: "10:25 AM",
    isOwn: false,
  },
  {
    id: 2,
    conversationId: 1,
    sender: "You",
    content: "Going well! Just finished the mockups.",
    time: "10:28 AM",
    isOwn: true,
  },
  {
    id: 3,
    conversationId: 1,
    sender: "John Doe",
    content: "Thanks for the project update!",
    time: "10:30 AM",
    isOwn: false,
  },
]

const mockDashboardStats = [
  { title: "Notes Created", value: "24", icon: "FileText", change: "+12%" },
  { title: "Tasks Completed", value: "18", icon: "CheckSquare", change: "+8%" },
  { title: "Forum Posts", value: "7", icon: "Users", change: "+3%" },
  { title: "Study Hours", value: "42", icon: "TrendingUp", change: "+15%" },
]

const mockRecentActivity = [
  {
    type: "note",
    title: "Physics Lab Report",
    description: "Updated quantum mechanics notes",
    time: "2 hours ago",
    author: "You",
  },
  {
    type: "todo",
    title: "Submit Assignment",
    description: "Mathematics homework due tomorrow",
    time: "4 hours ago",
    author: "You",
  },
  {
    type: "forum",
    title: "Study Group Discussion",
    description: "New post in Computer Science group",
    time: "6 hours ago",
    author: "Sarah Johnson",
  },
  {
    type: "chat",
    title: "Project Team",
    description: "New messages in group chat",
    time: "1 day ago",
    author: "Mike Chen",
  },
]

const mockCollaborators = [
  { name: 'John Doe', color: '#958DF1', initials: 'JD' },
  { name: 'Jane Smith', color: '#F98181', initials: 'JS' },
]

// Simulate API delay
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))

// API Functions matching your backend structure

// Users API - /api/users
export const usersAPI = {
  register: async (userData) => {
    await delay()
    return { success: true, user: { id: Date.now(), ...userData } }
  },
  
  login: async (credentials) => {
    await delay()
    return { success: true, token: 'mock-jwt-token', user: mockUsers[0] }
  },
  
  getUserProfile: async (id) => {
    await delay()
    return mockUsers.find(user => user.id === parseInt(id))
  },
  
  favoritePosts: async (postId) => {
    await delay()
    return { success: true }
  }
}

// Groups API - /api/groups
export const groupsAPI = {
  getGroups: async () => {
    await delay()
    return mockGroups
  },
  
  getGroupById: async (id) => {
    await delay()
    return mockGroups.find(group => group.id === parseInt(id))
  },
  
  createGroup: async (groupData) => {
    await delay()
    return { id: Date.now(), ...groupData }
  },
  
  updateGroup: async (id, groupData) => {
    await delay()
    return { id: parseInt(id), ...groupData }
  },
  
  deleteGroup: async (id) => {
    await delay()
    return { success: true }
  },
  
  addMember: async (groupId, userId) => {
    await delay()
    return { success: true }
  },
  
  removeMember: async (groupId, userId) => {
    await delay()
    return { success: true }
  },
  
  promoteToAdmin: async (groupId, userId) => {
    await delay()
    return { success: true }
  },
  
  demoteAdmin: async (groupId, userId) => {
    await delay()
    return { success: true }
  },
  
  leaveGroup: async (groupId) => {
    await delay()
    return { success: true }
  },
  
  getMyInvites: async () => {
    await delay()
    return []
  },
  
  acceptInvite: async (inviteId) => {
    await delay()
    return { success: true }
  },
  
  declineInvite: async (inviteId) => {
    await delay()
    return { success: true }
  }
}

// Posts API - /api/posts
export const postsAPI = {
  getPosts: async () => {
    await delay()
    return mockPosts
  },
  
  getPostById: async (id) => {
    await delay()
    return mockPosts.find(post => post.id === parseInt(id))
  },
  
  createPost: async (postData) => {
    await delay()
    return { id: Date.now(), ...postData }
  },
  
  updatePost: async (id, postData) => {
    await delay()
    return { id: parseInt(id), ...postData }
  },
  
  deletePost: async (id) => {
    await delay()
    return { success: true }
  },
  
  likePost: async (id) => {
    await delay()
    return { success: true }
  }
}

// Comments API - /api/comments
export const commentsAPI = {
  getComments: async (postId) => {
    await delay()
    return mockComments.filter(comment => comment.postId === parseInt(postId))
  },
  
  getCommentById: async (id) => {
    await delay()
    return mockComments.find(comment => comment.id === parseInt(id))
  },
  
  createComment: async (commentData) => {
    await delay()
    return { id: Date.now(), ...commentData }
  },
  
  updateComment: async (id, commentData) => {
    await delay()
    return { id: parseInt(id), ...commentData }
  },
  
  deleteComment: async (id) => {
    await delay()
    return { success: true }
  },
  
  upvoteComment: async (id) => {
    await delay()
    return { success: true }
  }
}

// Notes API - /api/notes
export const notesAPI = {
  getNotes: async () => {
    await delay()
    return mockNotes
  },
  
  getNoteById: async (id) => {
    await delay()
    return mockNotes.find(note => note.id === parseInt(id))
  },
  
  createNote: async (noteData) => {
    await delay()
    return { id: Date.now(), ...noteData }
  },
  
  updateNote: async (id, noteData) => {
    await delay()
    return { id: parseInt(id), ...noteData }
  },
  
  deleteNote: async (id) => {
    await delay()
    return { success: true }
  }
}

// Todos API - /api/todos
export const todosAPI = {
  getTodos: async () => {
    await delay()
    return mockTodos
  },
  
  getTodoById: async (id) => {
    await delay()
    return mockTodos.find(todo => todo.id === parseInt(id))
  },
  
  createTodo: async (todoData) => {
    await delay()
    return { id: Date.now(), ...todoData }
  },
  
  updateTodo: async (id, todoData) => {
    await delay()
    return { id: parseInt(id), ...todoData }
  },
  
  deleteTodo: async (id) => {
    await delay()
    return { success: true }
  }
}

// Messages API - /api/messages
export const messagesAPI = {
  getAllConversations: async () => {
    await delay()
    return mockConversations
  },
  
  getMessagesForConversation: async (conversationId) => {
    await delay()
    return mockMessages.filter(msg => msg.conversationId === parseInt(conversationId))
  },
  
  getMessagesForGroup: async (groupId) => {
    await delay()
    return mockMessages.filter(msg => msg.conversationId === parseInt(groupId))
  }
}

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    await delay()
    return mockDashboardStats
  },
  
  getRecentActivity: async () => {
    await delay()
    return mockRecentActivity
  }
}

// Collaborators API
export const collaboratorsAPI = {
  getCollaborators: async () => {
    await delay()
    return mockCollaborators
  }
}
