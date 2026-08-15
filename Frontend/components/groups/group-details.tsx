"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Crown, Plus, Users } from 'lucide-react'

interface GroupDetailsProps {
  selectedGroup: any
  isMobileView?: boolean
}

const members = [
  { name: "Sarah Johnson", role: "Admin", avatar: "SJ", online: true },
  { name: "Mike Chen", role: "Admin", avatar: "MC", online: false },
  { name: "Alex Rivera", role: "Member", avatar: "AR", online: true },
  { name: "Emma Wilson", role: "Member", avatar: "EW", online: true },
  { name: "John Doe", role: "Member", avatar: "JD", online: false },
]

export function GroupDetails({ selectedGroup, isMobileView = false }: GroupDetailsProps) {
  if (!selectedGroup) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-4 sm:p-6">
          <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-muted-foreground">Select a group</h3>
          <p className="text-sm text-muted-foreground">Choose a group to view members and settings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isMobileView ? 'w-full' : ''}>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <span className="truncate">{selectedGroup.name}</span>
          {selectedGroup.isAdmin && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
        </CardTitle>
        <CardDescription className="text-sm">{selectedGroup.description}</CardDescription>
        <Badge variant="outline" className="w-fit text-xs">
          {selectedGroup.category}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="text-xs sm:text-sm">Members</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-medium text-sm sm:text-base">Members ({selectedGroup.members})</h4>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <Plus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </div>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                        <AvatarFallback className="text-xs">{member.avatar}</AvatarFallback>
                      </Avatar>
                      {member.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-500 border border-background" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  {member.role === "Admin" && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
            {selectedGroup.pendingInvites > 0 && (
              <div className="pt-4 border-t">
                <h5 className="text-sm font-medium mb-2">Pending Invites ({selectedGroup.pendingInvites})</h5>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">jane.doe@email.com</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 sm:flex-none">
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Joined</p>
                <p className="text-xs text-muted-foreground">{selectedGroup.joined}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Activity</p>
                <p className="text-xs text-muted-foreground">{selectedGroup.lastActivity}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Admins</p>
                <div className="text-xs text-muted-foreground">{selectedGroup.admins.join(", ")}</div>
              </div>
            </div>
            {selectedGroup.isAdmin && (
              <div className="pt-4 border-t space-y-2">
                <Button size="sm" variant="outline" className="w-full bg-transparent">
                  Edit Group
                </Button>
                <Button size="sm" variant="destructive" className="w-full">
                  Delete Group
                </Button>
              </div>
            )}
            {!selectedGroup.isAdmin && (
              <div className="pt-4 border-t">
                <Button size="sm" variant="destructive" className="w-full">
                  Leave Group
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
