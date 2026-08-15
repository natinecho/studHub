"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus } from 'lucide-react'

export function CreatePostDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="post-title">Title</Label>
            <Input id="post-title" placeholder="Enter post title" />
          </div>
          <div>
            <Label htmlFor="post-content">Content</Label>
            <Textarea id="post-content" placeholder="What would you like to discuss?" rows={4} />
          </div>
          <div>
            <Label htmlFor="post-tags">Tags (comma separated)</Label>
            <Input id="post-tags" placeholder="study, collaboration, tips" />
          </div>
          <Button className="w-full">Create Post</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
