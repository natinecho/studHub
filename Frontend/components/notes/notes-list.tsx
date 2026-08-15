"use client"

import { NoteCard } from './note-card'

interface NotesListProps {
  notes: any[]
  selectedNote: any
  onNoteSelect: (note: any) => void
  isMobileView?: boolean
}

export function NotesList({ notes, selectedNote, onNoteSelect, isMobileView = false }: NotesListProps) {
  return (
    <div className={`${isMobileView ? 'col-span-full' : 'lg:col-span-1'} space-y-4`}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isSelected={selectedNote?.id === note.id}
          onSelect={onNoteSelect}
          isMobileView={isMobileView}
        />
      ))}
    </div>
  )
}
