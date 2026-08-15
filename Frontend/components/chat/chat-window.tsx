"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Settings, Users } from 'lucide-react'

interface ChatWindowProps {
  selectedChat: any
  messages: any[]
  isMobileView?: boolean
}

export function ChatWindow({ selectedChat, messages, isMobileView = false }: ChatWindowProps) {
  const [message, setMessage] = useState("")

  const sendMessage = () => {
    if (message.trim()) {
      setMessage("")
    }
  }

  if (!selectedChat) {
    return (
      <Card className={`${isMobileView ? 'h-[70vh]' : 'h-[500px]'} flex items-center justify-center`}>
        <CardContent className="text-center p-4 sm:p-6">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-muted-foreground">Select a conversation</h3>
          <p className="text-sm text-muted-foreground">Choose a chat to start messaging</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${isMobileView ? 'h-[70vh]' : 'h-[500px]'} flex flex-col`}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 p-3 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
            <AvatarFallback>{selectedChat.avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm sm:text-base truncate">{selectedChat.name}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedChat.online ? "Online now" : "Last seen 2 hours ago"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="flex-shrink-0">
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 ${
                    msg.isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.sender} • {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 sm:p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="text-sm"
            />
            <Button onClick={sendMessage} size="sm" className="flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
