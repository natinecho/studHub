"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Heart, MessageCircle, Pin, ChevronUp, ChevronDown } from 'lucide-react'

interface PostDetailsProps {
  selectedPost: any
  comments: any[]
  isMobileView?: boolean
}

export function PostDetails({ selectedPost, comments, isMobileView = false }: PostDetailsProps) {
  if (!selectedPost) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-4 sm:p-6">
          <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-muted-foreground">Select a post</h3>
          <p className="text-sm text-muted-foreground">Choose a discussion to view details and comments</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isMobileView ? 'w-full' : 'h-full'}>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          {selectedPost.pinned && <Pin className="h-4 w-4 text-primary" />}
          <Badge variant="outline" className="text-xs">
            {selectedPost.category}
          </Badge>
        </div>
        <CardTitle className="text-base sm:text-lg">{selectedPost.title}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
            <AvatarFallback className="text-xs">{selectedPost.authorInitials}</AvatarFallback>
          </Avatar>
          <span className="text-xs sm:text-sm text-muted-foreground">{selectedPost.author}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">•</span>
          <span className="text-xs sm:text-sm text-muted-foreground">{selectedPost.time}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <p className="text-sm mb-4">{selectedPost.content}</p>
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm">
            <Heart className="h-4 w-4 mr-1" />
            {selectedPost.likes}
          </Button>
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4 mr-1" />
            {selectedPost.comments}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          {selectedPost.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        <div className="space-y-4">
          <h4 className="font-medium text-sm sm:text-base">Replies ({comments.length})</h4>
          <ScrollArea className={`${isMobileView ? 'h-[300px]' : 'h-[200px]'}`}>
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2 pb-4">
                <div className="flex items-start gap-2">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs">{comment.authorInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{comment.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ChevronUp className="h-3 w-3" />
                        <span className="text-xs ml-1">{comment.upvotes}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ChevronDown className="h-3 w-3" />
                        <span className="text-xs ml-1">{comment.downvotes}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="space-y-2">
            <Textarea placeholder="Write a reply..." rows={3} className="text-sm" />
            <Button size="sm" className="w-full">
              Post Reply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
