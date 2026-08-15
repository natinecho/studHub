// Simulated data - replace with actual API calls later
export const colors = [
  '#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'
]

export const collaborators = [
  { name: 'John Doe', color: colors[0], initials: 'JD' },
  { name: 'Jane Smith', color: colors[1], initials: 'JS' },
]

export const notes = [
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

export const recentActivity = [
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

export const dashboardStats = [
  { title: "Notes Created", value: "24", icon: "FileText", change: "+12%" },
  { title: "Tasks Completed", value: "18", icon: "CheckSquare", change: "+8%" },
  { title: "Forum Posts", value: "7", icon: "Users", change: "+3%" },
  { title: "Study Hours", value: "42", icon: "TrendingUp", change: "+15%" },
]

export const tasks = [
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

// Simulated API functions
export const fetchNotes = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  return notes
}

export const fetchCollaborators = async () => {
  await new Promise(resolve => setTimeout(resolve, 50))
  return collaborators
}

export const fetchRecentActivity = async () => {
  await new Promise(resolve => setTimeout(resolve, 50))
  return recentActivity
}

export const fetchDashboardStats = async () => {
  await new Promise(resolve => setTimeout(resolve, 50))
  return dashboardStats
}

export const fetchTasks = async () => {
  await new Promise(resolve => setTimeout(resolve, 50))
  return tasks
}
