"use client"

import { useState, useEffect } from "react"
import { CreateNoteDialog } from './notes/create-note-dialog'
import { SearchAndFilter } from './notes/search-and-filter'
import { NotesList } from './notes/notes-list'
import { NoteEditor } from './notes/note-editor'
import { notesAPI, collaboratorsAPI } from '../data/api'
import { ListCardsSkeleton } from '@/components/skeletons'

interface CollaborativeNotesProps {
  selectedNote?: any
  onNoteSelect?: (note: any) => void
  isMobileView?: boolean
}

export function CollaborativeNotes({ selectedNote, onNoteSelect, isMobileView = false }: CollaborativeNotesProps) {
  const [internalSelectedNote, setInternalSelectedNote] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [notes, setNotes] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const currentSelectedNote = selectedNote || internalSelectedNote
  const handleNoteSelect = onNoteSelect || setInternalSelectedNote

  useEffect(() => {
    const loadData = async () => {
      try {
        const [notesData, collaboratorsData] = await Promise.all([
          notesAPI.getNotes(),
          collaboratorsAPI.getCollaborators()
        ])
        setNotes(notesData)
        setCollaborators(collaboratorsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <ListCardsSkeleton count={3} padding={14} titleHeight={16} />
      </div>
    )
  }

  // Mobile view - show only editor when note is selected
  if (isMobileView && currentSelectedNote) {
    return (
      <div className="space-y-4">
        <NoteEditor 
          selectedNote={currentSelectedNote}
          collaborators={collaborators}
          isMobileView={true}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Collaborative Notes
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Create, edit, and share notes in real-time with your study groups</p>
        </div>
        <CreateNoteDialog />
      </div>

      <SearchAndFilter 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <NotesList 
          notes={filteredNotes}
          selectedNote={currentSelectedNote}
          onNoteSelect={handleNoteSelect}
          isMobileView={isMobileView}
        />
        {!isMobileView && (
          <NoteEditor 
            selectedNote={currentSelectedNote}
            collaborators={collaborators}
            isMobileView={false}
          />
        )}
      </div>
    </div>
  )
}
