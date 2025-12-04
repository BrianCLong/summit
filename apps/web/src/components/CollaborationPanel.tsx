import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserAwareness } from '@/lib/yjs/useCollaboration';
import { Users } from 'lucide-react';

interface CollaborationPanelProps {
  users: UserAwareness[];
  isConnected: boolean;
  isSynced: boolean;
}

export function CollaborationPanel({ users, isConnected, isSynced }: CollaborationPanelProps) {
  return (
    <Card className="fixed bottom-4 left-4 w-64 shadow-lg z-50">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Collaborators
        </CardTitle>
        <div className="flex items-center gap-2">
           <Badge variant={isConnected ? "default" : "destructive"} className="text-[10px] px-1 h-5">
             {isConnected ? 'Online' : 'Offline'}
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4 max-h-40 overflow-y-auto">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground">No other users active</p>
        ) : (
          <div className="space-y-2">
            {users.map((user, idx) => (
              <div key={`${user.id}-${idx}`} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                <span className="truncate">{user.name}</span>
                {user.selection && user.selection.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        Editing {user.selection.length} items
                    </span>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground border-t pt-1">
            Status: {isSynced ? 'Synced' : 'Syncing...'}
        </div>
      </CardContent>
    </Card>
  );
}
