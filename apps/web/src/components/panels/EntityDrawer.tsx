import * as React from 'react'
import {
  ExternalLink,
  Edit3,
  Trash2,
  Tag,
  Calendar,
  User,
  MapPin,
  MessageSquare,
  Unlink,
} from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/Drawer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { renderMarkdown } from '@/lib/markdown'
import { formatDate } from '@/lib/utils'
import type { Entity, EntityComment, Relationship, PanelProps } from '@/types'

interface EntityDrawerProps extends PanelProps<Entity[]> {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEntityId?: string
  relationships?: Relationship[]
}

export function EntityDrawer({
  data: entities,
  loading: _loading = false,
  error: _error,
  onSelect,
  onAction,
  open,
  onOpenChange,
  selectedEntityId,
  relationships = [],
}: EntityDrawerProps) {
  const selectedEntity = entities.find(e => e.id === selectedEntityId)
  const { user } = useAuth()
  const [comments, setComments] = React.useState<EntityComment[]>([])
  const [commentDraft, setCommentDraft] = React.useState('')
  const [commentsLoading, setCommentsLoading] = React.useState(false)
  const [commentError, setCommentError] = React.useState<string | null>(null)
  const [commentSubmitting, setCommentSubmitting] = React.useState(false)

  const tenantId =
    (user as { tenantId?: string } | null)?.tenantId ||
    localStorage.getItem('tenant_id') ||
    'demo-tenant'
  const userId =
    user?.id || localStorage.getItem('user_id') || user?.email || 'system'
  const authToken = localStorage.getItem('auth_token')

  const fetchComments = React.useCallback(async () => {
    if (!selectedEntity?.id) {
      return
    }

    setCommentsLoading(true)
    setCommentError(null)

    try {
      const headers: HeadersInit = {
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      }
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      const response = await fetch(
        `/api/entities/${selectedEntity.id}/comments`,
        { headers },
      )

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = (await response.json()) as EntityComment[]
      setComments(data)
    } catch (err) {
      setCommentError((err as Error).message)
    } finally {
      setCommentsLoading(false)
    }
  }, [authToken, selectedEntity?.id, tenantId, userId])

  const handleAddComment = React.useCallback(async () => {
    if (!selectedEntity?.id || !commentDraft.trim()) {
      return
    }

    setCommentSubmitting(true)
    setCommentError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      }
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      const response = await fetch(
        `/api/entities/${selectedEntity.id}/comments`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: commentDraft.trim(),
            entityType: selectedEntity.type,
            entityLabel: selectedEntity.name,
            metadata: { source: 'entity-inspector' },
          }),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const created = (await response.json()) as EntityComment
      setComments(prev => [...prev, created])
      setCommentDraft('')
    } catch (err) {
      setCommentError((err as Error).message)
    } finally {
      setCommentSubmitting(false)
    }
  }, [
    authToken,
    commentDraft,
    selectedEntity?.id,
    selectedEntity?.name,
    selectedEntity?.type,
    tenantId,
    userId,
  ])

  React.useEffect(() => {
    if (open && selectedEntity?.id) {
      fetchComments()
    }
  }, [fetchComments, open, selectedEntity?.id])

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON':
        return '👤'
      case 'ORGANIZATION':
        return '🏢'
      case 'LOCATION':
        return '📍'
      case 'IP_ADDRESS':
        return '🌐'
      case 'DOMAIN':
        return '🔗'
      case 'EMAIL':
        return '📧'
      case 'PHONE':
        return '📞'
      case 'FILE':
        return '📄'
      case 'HASH':
        return '🔑'
      case 'MALWARE':
        return '🦠'
      default:
        return '📊'
    }
  }

  const getRelatedEntities = () => {
    if (!selectedEntity) {return []}

    const relatedIds = relationships
      .filter(
        r =>
          r.sourceId === selectedEntity.id || r.targetId === selectedEntity.id
      )
      .map(r => (r.sourceId === selectedEntity.id ? r.targetId : r.sourceId))

    return entities.filter(e => relatedIds.includes(e.id))
  }

  const relatedEntities = getRelatedEntities()

  if (!selectedEntity) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="w-96">
          <DrawerHeader>
            <DrawerTitle>Entity Details</DrawerTitle>
            <DrawerDescription>
              Select an entity to view its details and relationships
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No entity selected
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="w-96">
        <DrawerHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {getEntityIcon(selectedEntity.type)}
            </span>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="truncate">
                {selectedEntity.name}
              </DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{selectedEntity.type}</Badge>
                <Badge
                  variant={
                    selectedEntity.confidence > 0.8
                      ? 'success'
                      : selectedEntity.confidence > 0.6
                        ? 'warning'
                        : 'error'
                  }
                >
                  {Math.round(selectedEntity.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit entity"
                    onClick={() => onAction?.('edit', selectedEntity)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit entity</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete entity"
                    onClick={() => onAction?.('delete', selectedEntity)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete entity</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Export entity"
                    onClick={() => onAction?.('export', selectedEntity)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export entity</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="relationships">Relations</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="space-y-4 p-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(selectedEntity.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Source:</span>
                    <span>{selectedEntity.source || 'Unknown'}</span>
                  </div>

                  {selectedEntity.properties.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedEntity.properties.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedEntity.tags && selectedEntity.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntity.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Custom Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(selectedEntity.properties).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-right max-w-32 truncate">
                            {typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="relationships"
              className="space-y-4 p-4 overflow-y-auto"
            >
              <div className="text-sm text-muted-foreground mb-4">
                {relatedEntities.length} related entities found
              </div>

              {relatedEntities.length === 0 ? (
                <EmptyState
                  icon={<Unlink className="h-8 w-8 text-muted-foreground" />}
                  title="No relationships found"
                  description="This entity is not connected to any other entities."
                />
              ) : (
                <div className="space-y-2">
                  {relatedEntities.map(entity => {
                    const relationship = relationships.find(
                      r =>
                        (r.sourceId === selectedEntity.id &&
                          r.targetId === entity.id) ||
                        (r.targetId === selectedEntity.id &&
                          r.sourceId === entity.id)
                    )

                    return (
                      <Card
                        key={entity.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onSelect?.(entity)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {getEntityIcon(entity.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {entity.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {relationship?.type
                                  .replace('_', ' ')
                                  .toLowerCase()}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {entity.type}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="timeline"
              className="space-y-4 p-4 overflow-y-auto"
            >
              <div className="text-sm text-muted-foreground mb-4">
                Entity activity timeline
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Entity Created</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(selectedEntity.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Last Updated</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(selectedEntity.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Add more timeline events as needed */}
              </div>
            </TabsContent>

            <TabsContent
              value="comments"
              className="space-y-4 p-4 overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Add comment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={commentDraft}
                    onChange={event => setCommentDraft(event.target.value)}
                    placeholder="Write a comment with @mentions"
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Markdown supported
                    </span>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      loading={commentSubmitting}
                      disabled={!commentDraft.trim()}
                    >
                      Post comment
                    </Button>
                  </div>
                  {commentError && (
                    <div className="text-xs text-destructive">
                      {commentError}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading comments…
                  </div>
                ) : comments.length === 0 ? (
                  <EmptyState
                    icon={
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    }
                    title="No comments yet"
                    description="Be the first to share your thoughts."
                  />
                ) : (
                  comments.map(comment => (
                    <Card key={comment.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground">
                          {comment.authorId} •{' '}
                          {formatDate(comment.createdAt)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(comment.content),
                          }}
                        />
                        {comment.mentions?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {comment.mentions.map(mention => (
                              <Badge key={mention.userId} variant="secondary">
                                @{mention.username}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {comment.attachments?.length > 0 && (
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {comment.attachments.map(attachment => (
                              <div key={attachment.id}>
                                📎 {attachment.fileName}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
