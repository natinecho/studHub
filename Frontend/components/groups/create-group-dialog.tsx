"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus } from 'lucide-react'

export function CreateGroupDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input id="group-name" placeholder="Enter group name" />
          </div>
          <div>
            <Label htmlFor="group-description">Description</Label>
            <Textarea id="group-description" placeholder="Describe your group's purpose" rows={3} />
          </div>
          <div>
            <Label htmlFor="group-category">Category</Label>
            <Input id="group-category" placeholder="e.g., Academic, Project, Social" />
          </div>
          <Button className="w-full">Create Group</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
