"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus } from 'lucide-react'

export function CreateNoteDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Collaborative Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Enter note title" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief description of your note..." rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" placeholder="physics, quantum, theory" className="mt-1" />
          </div>
          <div>
            <Label>Collaboration Type</Label>
            <div className="flex gap-2 mt-1">
              <Button variant="outline" size="sm" className="flex-1">Personal</Button>
              <Button variant="default" size="sm" className="flex-1">Group</Button>
            </div>
          </div>
          <Button className="w-full">Create Note</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
