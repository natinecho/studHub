"use client"

import { useEffect } from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Heading from '@tiptap/extension-heading'
import Strike from '@tiptap/extension-strike'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Share, Star, Eye, Users, FileText } from 'lucide-react'
import { EditorMenuBar } from './editor-menu-bar'

interface NoteEditorProps {
  selectedNote: any
  collaborators: any[]
  isMobileView?: boolean
}

export function NoteEditor({ selectedNote, collaborators, isMobileView = false }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Strike,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 hover:text-primary/80',
        },
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
    ],
    content: selectedNote?.content || '<p>Start writing your collaborative note...</p>',
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${isMobileView ? 'min-h-[400px]' : 'min-h-[300px]'} p-2 sm:p-4`,
      },
      handleKeyDown: (view, event) => {
        if (event.ctrlKey || event.metaKey) {
          if (event.key === 'z' && !event.shiftKey) {
            editor?.chain().focus().undo().run()
            return true
          }
          if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
            editor?.chain().focus().redo().run()
            return true
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && selectedNote) {
      editor.commands.setContent(selectedNote.content)
    }
  }, [selectedNote, editor])

  if (!selectedNote) {
    return (
      <div className={`${isMobileView ? 'col-span-full' : 'lg:col-span-2'}`}>
        <Card className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
          <CardContent className="text-center p-4 sm:p-6">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Select a note to start collaborating</h3>
            <p className="text-sm text-muted-foreground">Choose a note from the list to view and edit with your team</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`${isMobileView ? 'col-span-full' : 'lg:col-span-2'}`}>
      <Card className="h-full shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-background to-muted/30 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <span className="truncate">{selectedNote.title}</span>
                {selectedNote.starred && <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                  <AvatarFallback className="text-xs">{selectedNote.authorInitials}</AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm text-muted-foreground truncate">{selectedNote.author}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">•</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{selectedNote.time}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedNote.type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="hover:bg-primary/10 text-xs sm:text-sm">
                <Share className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          <div className="border rounded-lg m-2 sm:m-4 overflow-hidden bg-background">
            <EditorMenuBar editor={editor} collaborators={collaborators} isMobileView={isMobileView} />
            <EditorContent 
              editor={editor} 
              className={`${isMobileView ? 'min-h-[400px]' : 'min-h-[300px]'} focus-within:ring-2 focus-within:ring-primary/20 transition-all`}
            />
          </div>
          
          <div className="border-t p-3 sm:p-4 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="hover:bg-primary/10 transition-colors text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{selectedNote.views} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{selectedNote.collaborators} collaborators</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
