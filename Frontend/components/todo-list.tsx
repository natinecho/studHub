"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { TaskRowsSkeleton } from "@/components/skeletons"
import { Plus, Calendar, Trash2, Flag } from 'lucide-react'
import { todosAPI } from '../data/api'

export function TodoList() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasksData = await todosAPI.getTodos()
        setTasks(tasksData)
      } catch (error) {
        console.error('Error loading tasks:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [])

  const toggleTask = async (id: number) => {
    try {
      // Update local state immediately for better UX
      setTasks(prevTasks => 
        prevTasks.map((task) => 
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      )
      
      // Here you would call the API to update the task
      // await todosAPI.updateTodo(id, { completed: !task.completed })
    } catch (error) {
      console.error('Error updating task:', error)
      // Revert the change if API call fails
      setTasks(prevTasks => 
        prevTasks.map((task) => 
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      )
    }
  }

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <Flag className="h-3 w-3 text-red-500" />
      case "medium":
        return <Flag className="h-3 w-3 text-yellow-500" />
      case "low":
        return <Flag className="h-3 w-3 text-green-500" />
      default:
        return <Flag className="h-3 w-3 text-gray-500" />
    }
  }

  if (loading) {
    return <TaskRowsSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Todo List</h1>
          <p className="text-muted-foreground">Manage your tasks and assignments</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Task Title</Label>
                <Input id="task-title" placeholder="Enter your task..." />
              </div>
              <div>
                <Label htmlFor="task-description">Description (Optional)</Label>
                <Textarea id="task-description" placeholder="Add more details..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select defaultValue="academic">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="group-work">Group Work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input id="due-date" type="date" />
              </div>
              <Button className="w-full">Add Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  checked={task.completed} 
                  onCheckedChange={() => toggleTask(task.id)} 
                  className="mt-1" 
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className={`font-medium transition-all duration-200 ${
                      task.completed 
                        ? "line-through text-muted-foreground opacity-60" 
                        : "text-foreground"
                    }`}>
                      {task.title}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {task.description && (
                    <p className={`text-sm transition-all duration-200 ${
                      task.completed 
                        ? "line-through text-muted-foreground opacity-60" 
                        : "text-muted-foreground"
                    }`}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(task.priority)}
                      <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {task.category}
                    </Badge>
                    {task.type === "group" && (
                      <Badge variant="secondary" className="text-xs">
                        Group Task
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
