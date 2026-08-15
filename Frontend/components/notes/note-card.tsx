"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2, Clock, Eye, Users, Star } from 'lucide-react'

interface NoteCardProps {
  note: any
  isSelected: boolean
  onSelect: (note: any) => void
  isMobileView?: boolean
}

export function NoteCard({ note, isSelected, onSelect }: NoteCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
        isSelected 
          ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
          : "hover:bg-muted/30"
      }`}
      onClick={() => onSelect(note)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {note.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
            <Badge 
              variant={note.status === 'active' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {note.status}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        <CardTitle className="text-base hover:text-primary transition-colors">
          {note.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">{note.authorInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{note.author}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{note.lastEdited}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{note.views}</span>
            </div>
          </div>
          {note.type === "group" && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{note.collaborators}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs hover:bg-primary/10 transition-colors">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
