"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDrawer = EntityDrawer;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Drawer_1 = require("@/components/ui/Drawer");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const textarea_1 = require("@/components/ui/textarea");
const Tabs_1 = require("@/components/ui/Tabs");
const Card_1 = require("@/components/ui/Card");
const Tooltip_1 = require("@/components/ui/Tooltip");
const AuthContext_1 = require("@/contexts/AuthContext");
const markdown_1 = require("@/lib/markdown");
const utils_1 = require("@/lib/utils");
function EntityDrawer({ data: entities, loading = false, error, onSelect, onAction, open, onOpenChange, selectedEntityId, relationships = [], }) {
    const selectedEntity = entities.find(e => e.id === selectedEntityId);
    const { user } = (0, AuthContext_1.useAuth)();
    const [comments, setComments] = React.useState([]);
    const [commentDraft, setCommentDraft] = React.useState('');
    const [commentsLoading, setCommentsLoading] = React.useState(false);
    const [commentError, setCommentError] = React.useState(null);
    const [commentSubmitting, setCommentSubmitting] = React.useState(false);
    const tenantId = user?.tenantId ||
        localStorage.getItem('tenant_id') ||
        'demo-tenant';
    const userId = user?.id || localStorage.getItem('user_id') || user?.email || 'system';
    const authToken = localStorage.getItem('auth_token');
    const fetchComments = React.useCallback(async () => {
        if (!selectedEntity?.id) {
            return;
        }
        setCommentsLoading(true);
        setCommentError(null);
        try {
            const headers = {
                'x-tenant-id': tenantId,
                'x-user-id': userId,
            };
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }
            const response = await fetch(`/api/entities/${selectedEntity.id}/comments`, { headers });
            if (!response.ok) {
                throw new Error('Failed to load comments');
            }
            const data = (await response.json());
            setComments(data);
        }
        catch (err) {
            setCommentError(err.message);
        }
        finally {
            setCommentsLoading(false);
        }
    }, [authToken, selectedEntity?.id, tenantId, userId]);
    const handleAddComment = React.useCallback(async () => {
        if (!selectedEntity?.id || !commentDraft.trim()) {
            return;
        }
        setCommentSubmitting(true);
        setCommentError(null);
        try {
            const headers = {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId,
                'x-user-id': userId,
            };
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }
            const response = await fetch(`/api/entities/${selectedEntity.id}/comments`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    content: commentDraft.trim(),
                    entityType: selectedEntity.type,
                    entityLabel: selectedEntity.name,
                    metadata: { source: 'entity-inspector' },
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to add comment');
            }
            const created = (await response.json());
            setComments(prev => [...prev, created]);
            setCommentDraft('');
        }
        catch (err) {
            setCommentError(err.message);
        }
        finally {
            setCommentSubmitting(false);
        }
    }, [
        authToken,
        commentDraft,
        selectedEntity?.id,
        selectedEntity?.name,
        selectedEntity?.type,
        tenantId,
        userId,
    ]);
    React.useEffect(() => {
        if (open && selectedEntity?.id) {
            fetchComments();
        }
    }, [fetchComments, open, selectedEntity?.id]);
    const getEntityIcon = (type) => {
        switch (type) {
            case 'PERSON':
                return '👤';
            case 'ORGANIZATION':
                return '🏢';
            case 'LOCATION':
                return '📍';
            case 'IP_ADDRESS':
                return '🌐';
            case 'DOMAIN':
                return '🔗';
            case 'EMAIL':
                return '📧';
            case 'PHONE':
                return '📞';
            case 'FILE':
                return '📄';
            case 'HASH':
                return '🔑';
            case 'MALWARE':
                return '🦠';
            default:
                return '📊';
        }
    };
    const getRelatedEntities = () => {
        if (!selectedEntity) {
            return [];
        }
        const relatedIds = relationships
            .filter(r => r.sourceId === selectedEntity.id || r.targetId === selectedEntity.id)
            .map(r => (r.sourceId === selectedEntity.id ? r.targetId : r.sourceId));
        return entities.filter(e => relatedIds.includes(e.id));
    };
    const relatedEntities = getRelatedEntities();
    if (!selectedEntity) {
        return (<Drawer_1.Drawer open={open} onOpenChange={onOpenChange}>
        <Drawer_1.DrawerContent side="right" className="w-96">
          <Drawer_1.DrawerHeader>
            <Drawer_1.DrawerTitle>Entity Details</Drawer_1.DrawerTitle>
            <Drawer_1.DrawerDescription>
              Select an entity to view its details and relationships
            </Drawer_1.DrawerDescription>
          </Drawer_1.DrawerHeader>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No entity selected
          </div>
        </Drawer_1.DrawerContent>
      </Drawer_1.Drawer>);
    }
    return (<Drawer_1.Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer_1.DrawerContent side="right" className="w-96">
        <Drawer_1.DrawerHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {getEntityIcon(selectedEntity.type)}
            </span>
            <div className="flex-1 min-w-0">
              <Drawer_1.DrawerTitle className="truncate">
                {selectedEntity.name}
              </Drawer_1.DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge_1.Badge variant="outline">{selectedEntity.type}</Badge_1.Badge>
                <Badge_1.Badge variant={selectedEntity.confidence > 0.8
            ? 'success'
            : selectedEntity.confidence > 0.6
                ? 'warning'
                : 'error'} icon={selectedEntity.confidence > 0.8 ? (<lucide_react_1.CheckCircle2 className="h-3 w-3"/>) : selectedEntity.confidence > 0.6 ? (<lucide_react_1.AlertTriangle className="h-3 w-3"/>) : (<lucide_react_1.AlertCircle className="h-3 w-3"/>)}>
                  {Math.round(selectedEntity.confidence * 100)}% confidence
                </Badge_1.Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Tooltip_1.Tooltip>
                <Tooltip_1.TooltipTrigger asChild>
                  <Button_1.Button variant="ghost" size="icon" aria-label="Edit entity" onClick={() => onAction?.('edit', selectedEntity)}>
                    <lucide_react_1.Edit3 className="h-4 w-4"/>
                  </Button_1.Button>
                </Tooltip_1.TooltipTrigger>
                <Tooltip_1.TooltipContent>Edit entity</Tooltip_1.TooltipContent>
              </Tooltip_1.Tooltip>

              <Tooltip_1.Tooltip>
                <Tooltip_1.TooltipTrigger asChild>
                  <Button_1.Button variant="ghost" size="icon" aria-label="Delete entity" onClick={() => onAction?.('delete', selectedEntity)}>
                    <lucide_react_1.Trash2 className="h-4 w-4"/>
                  </Button_1.Button>
                </Tooltip_1.TooltipTrigger>
                <Tooltip_1.TooltipContent>Delete entity</Tooltip_1.TooltipContent>
              </Tooltip_1.Tooltip>

              <Tooltip_1.Tooltip>
                <Tooltip_1.TooltipTrigger asChild>
                  <Button_1.Button variant="ghost" size="icon" aria-label="Export entity" onClick={() => onAction?.('export', selectedEntity)}>
                    <lucide_react_1.ExternalLink className="h-4 w-4"/>
                  </Button_1.Button>
                </Tooltip_1.TooltipTrigger>
                <Tooltip_1.TooltipContent>Export entity</Tooltip_1.TooltipContent>
              </Tooltip_1.Tooltip>
            </div>
          </div>
        </Drawer_1.DrawerHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs_1.Tabs defaultValue="overview" className="h-full">
            <Tabs_1.TabsList className="grid w-full grid-cols-4">
              <Tabs_1.TabsTrigger value="overview">Overview</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="relationships">Relations</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="timeline">Timeline</Tabs_1.TabsTrigger>
              <Tabs_1.TabsTrigger value="comments">Comments</Tabs_1.TabsTrigger>
            </Tabs_1.TabsList>

            <Tabs_1.TabsContent value="overview" className="space-y-4 p-4 overflow-y-auto">
              <Card_1.Card>
                <Card_1.CardHeader>
                  <Card_1.CardTitle className="text-sm">Properties</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <lucide_react_1.Calendar className="h-4 w-4 text-muted-foreground"/>
                    <span className="text-muted-foreground">Created:</span>
                    <span>{(0, utils_1.formatDate)(selectedEntity.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <lucide_react_1.User className="h-4 w-4 text-muted-foreground"/>
                    <span className="text-muted-foreground">Source:</span>
                    <span>{selectedEntity.source || 'Unknown'}</span>
                  </div>

                  {selectedEntity.properties.location && (<div className="flex items-center gap-2 text-sm">
                      <lucide_react_1.MapPin className="h-4 w-4 text-muted-foreground"/>
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedEntity.properties.location}</span>
                    </div>)}
                </Card_1.CardContent>
              </Card_1.Card>

              {selectedEntity.tags && selectedEntity.tags.length > 0 && (<Card_1.Card>
                  <Card_1.CardHeader>
                    <Card_1.CardTitle className="text-sm flex items-center gap-2">
                      <lucide_react_1.Tag className="h-4 w-4"/>
                      Tags
                    </Card_1.CardTitle>
                  </Card_1.CardHeader>
                  <Card_1.CardContent>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntity.tags.map(tag => (<Badge_1.Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge_1.Badge>))}
                    </div>
                  </Card_1.CardContent>
                </Card_1.Card>)}

              <Card_1.Card>
                <Card_1.CardHeader>
                  <Card_1.CardTitle className="text-sm">Custom Properties</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent>
                  <div className="space-y-2">
                    {Object.entries(selectedEntity.properties).map(([key, value]) => (<div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-right max-w-32 truncate">
                            {typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)}
                          </span>
                        </div>))}
                  </div>
                </Card_1.CardContent>
              </Card_1.Card>
            </Tabs_1.TabsContent>

            <Tabs_1.TabsContent value="relationships" className="space-y-4 p-4 overflow-y-auto">
              <div className="text-sm text-muted-foreground mb-4">
                {relatedEntities.length} related entities found
              </div>

              {relatedEntities.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  No relationships found
                </div>) : (<div className="space-y-2">
                  {relatedEntities.map(entity => {
                const relationship = relationships.find(r => (r.sourceId === selectedEntity.id &&
                    r.targetId === entity.id) ||
                    (r.targetId === selectedEntity.id &&
                        r.sourceId === entity.id));
                return (<Card_1.Card key={entity.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect?.(entity)}>
                        <Card_1.CardContent className="p-3">
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
                            <Badge_1.Badge variant="outline" className="text-xs">
                              {entity.type}
                            </Badge_1.Badge>
                          </div>
                        </Card_1.CardContent>
                      </Card_1.Card>);
            })}
                </div>)}
            </Tabs_1.TabsContent>

            <Tabs_1.TabsContent value="timeline" className="space-y-4 p-4 overflow-y-auto">
              <div className="text-sm text-muted-foreground mb-4">
                Entity activity timeline
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Entity Created</div>
                    <div className="text-xs text-muted-foreground">
                      {(0, utils_1.formatDate)(selectedEntity.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Last Updated</div>
                    <div className="text-xs text-muted-foreground">
                      {(0, utils_1.formatDate)(selectedEntity.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Add more timeline events as needed */}
              </div>
            </Tabs_1.TabsContent>

            <Tabs_1.TabsContent value="comments" className="space-y-4 p-4 overflow-y-auto">
              <Card_1.Card>
                <Card_1.CardHeader>
                  <Card_1.CardTitle className="text-sm">Add comment</Card_1.CardTitle>
                </Card_1.CardHeader>
                <Card_1.CardContent className="space-y-3">
                  <textarea_1.Textarea value={commentDraft} onChange={event => setCommentDraft(event.target.value)} placeholder="Write a comment with @mentions" rows={4}/>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Markdown supported
                    </span>
                    <Button_1.Button size="sm" onClick={handleAddComment} loading={commentSubmitting} disabled={!commentDraft.trim()}>
                      Post comment
                    </Button_1.Button>
                  </div>
                  {commentError && (<div className="text-xs text-destructive">
                      {commentError}
                    </div>)}
                </Card_1.CardContent>
              </Card_1.Card>

              <div className="space-y-3">
                {commentsLoading ? (<div className="text-sm text-muted-foreground">
                    Loading comments…
                  </div>) : comments.length === 0 ? (<div className="text-sm text-muted-foreground">
                    No comments yet.
                  </div>) : (comments.map(comment => (<Card_1.Card key={comment.id}>
                      <Card_1.CardHeader className="pb-2">
                        <Card_1.CardTitle className="text-xs text-muted-foreground">
                          {comment.authorId} •{' '}
                          {(0, utils_1.formatDate)(comment.createdAt)}
                        </Card_1.CardTitle>
                      </Card_1.CardHeader>
                      <Card_1.CardContent className="space-y-3 text-sm">
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                __html: (0, markdown_1.renderMarkdown)(comment.content),
            }}/>
                        {comment.mentions?.length > 0 && (<div className="flex flex-wrap gap-2">
                            {comment.mentions.map(mention => (<Badge_1.Badge key={mention.userId} variant="secondary">
                                @{mention.username}
                              </Badge_1.Badge>))}
                          </div>)}
                        {comment.attachments?.length > 0 && (<div className="space-y-1 text-xs text-muted-foreground">
                            {comment.attachments.map(attachment => (<div key={attachment.id}>
                                📎 {attachment.fileName}
                              </div>))}
                          </div>)}
                      </Card_1.CardContent>
                    </Card_1.Card>)))}
              </div>
            </Tabs_1.TabsContent>
          </Tabs_1.Tabs>
        </div>
      </Drawer_1.DrawerContent>
    </Drawer_1.Drawer>);
}
