"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, Clock } from 'lucide-react'

interface GroupCardProps {
  group: any
  isSelected: boolean
  onSelect: (group: any) => void
}

export function GroupCard({ group, isSelected, onSelect }: GroupCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => onSelect(group)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {group.name}
              {group.isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription className="mt-1">{group.description}</CardDescription>
          </div>
          <Badge variant="outline">{group.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{group.members} members</span>
            </div>
            {group.pendingInvites > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{group.pendingInvites} pending</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">Active {group.lastActivity}</span>
        </div>
      </CardContent>
    </Card>
  )
}
