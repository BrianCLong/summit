const fs = require('fs');

const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const replaceMap1 = `          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => navigate(action.href)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(action.href)
                  }
                }}
                role="button"
                aria-label={\`\${action.title}: \${action.description}\`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={\`p-2 rounded-lg \${action.color} text-white\`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {action.title}
                        {action.badge && (
                          <Badge variant="destructive" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}`;

const newMap1 = `          {quickActions.map(action => (
            <QuickActionCard
              key={action.title}
              action={action as any}
              onActionClick={handleActionClick}
              onActionKeyDown={handleActionKeyDown}
            />
          ))}`;
content = content.replace(replaceMap1, newMap1);
fs.writeFileSync(path, content, 'utf8');
