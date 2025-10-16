import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { useFlag, useFlagUpdater } from '../../hooks/useFlag';

const FeatureFlagPanel = () => {
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const { updateFlag } = useFlagUpdater();

  // Load current flag states
  useEffect(() => {
    const loadFlags = () => {
      const storedFlags = localStorage.getItem('feature-flags');
      if (storedFlags) {
        try {
          setFlags(JSON.parse(storedFlags));
        } catch (error) {
          console.warn('Failed to load flags:', error);
        }
      }
      setLoading(false);
    };

    loadFlags();

    // Listen for flag updates
    const handleFlagUpdate = () => loadFlags();
    window.addEventListener('feature-flags-updated', handleFlagUpdate);

    return () =>
      window.removeEventListener('feature-flags-updated', handleFlagUpdate);
  }, []);

  const flagDefinitions = {
    'realtime-presence': {
      name: 'Realtime Presence',
      description: 'Platform-wide presence indicators with avatar groups',
      category: 'Collaboration',
      defaultRollout: 100,
    },
    'graph-streaming': {
      name: 'Graph Streaming',
      description: 'Neighborhood streaming with progress indicators',
      category: 'Performance',
      defaultRollout: 80,
    },
    'k-shortest-paths': {
      name: 'K-Shortest Paths',
      description: 'K-shortest paths UI (k≤5, depth≤6)',
      category: 'Analysis',
      defaultRollout: 100,
    },
    'advanced-search': {
      name: 'Advanced Search',
      description: 'Query chips and keyboard DSL search',
      category: 'Search',
      defaultRollout: 100,
    },
    'bulk-actions': {
      name: 'Bulk Actions',
      description: 'Bulk operations on search results',
      category: 'Search',
      defaultRollout: 90,
    },
    'report-templates': {
      name: 'Report Templates',
      description: 'Executive and Forensics report templates',
      category: 'Reports',
      defaultRollout: 100,
    },
    'forensics-reports': {
      name: 'Forensics Reports',
      description: 'Advanced forensics reporting with chain of custody',
      category: 'Reports',
      defaultRollout: 100,
    },
    'fps-monitor': {
      name: 'FPS Monitor',
      description: 'Development FPS monitoring',
      category: 'Debug',
      defaultRollout: 100,
      devOnly: true,
    },
    'event-inspector': {
      name: 'Event Inspector',
      description: 'Development event inspector for GraphQL subscriptions',
      category: 'Debug',
      defaultRollout: 100,
      devOnly: true,
    },
    'optimistic-updates': {
      name: 'Optimistic Updates',
      description: 'Optimistic mutations with conflict rollback',
      category: 'Performance',
      defaultRollout: 75,
    },
    'multi-language': {
      name: 'Multi-Language',
      description: 'NATO locale support (29 countries)',
      category: 'Localization',
      defaultRollout: 50,
    },
  };

  const handleFlagToggle = (flagKey) => {
    const currentFlag = flags[flagKey] || {};
    const newEnabled = !currentFlag.enabled;

    updateFlag(flagKey, {
      enabled: newEnabled,
      rollout: newEnabled
        ? currentFlag.rollout || flagDefinitions[flagKey].defaultRollout
        : 0,
    });
  };

  const handleRolloutChange = (flagKey, rollout) => {
    const currentFlag = flags[flagKey] || {};

    updateFlag(flagKey, {
      enabled: rollout > 0,
      rollout: rollout,
    });
  };

  const emergencyDisableAll = () => {
    if (
      !confirm(
        '⚠️ This will disable all non-essential feature flags. Continue?',
      )
    ) {
      return;
    }

    const essentialFlags = ['advanced-search'];

    Object.keys(flagDefinitions).forEach((flagKey) => {
      if (!essentialFlags.includes(flagKey)) {
        updateFlag(flagKey, { enabled: false, rollout: 0 });
      }
    });
  };

  const resetToDefaults = () => {
    if (!confirm('Reset all flags to default configuration?')) {
      return;
    }

    localStorage.removeItem('feature-flags');
    window.dispatchEvent(new CustomEvent('feature-flags-updated'));
  };

  if (loading) {
    return <div className="p-4">Loading feature flags...</div>;
  }

  const categories = [
    ...new Set(Object.values(flagDefinitions).map((f) => f.category)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Feature Flags</h2>
          <p className="text-muted-foreground">
            Manage feature rollouts and toggles
          </p>
        </div>

        <div className="space-x-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button variant="destructive" onClick={emergencyDisableAll}>
            🚨 Emergency Disable
          </Button>
        </div>
      </div>

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(flagDefinitions)
                .filter(([_, def]) => def.category === category)
                .map(([flagKey, definition]) => {
                  const currentFlag = flags[flagKey] || {};
                  const isEnabled = currentFlag.enabled ?? true;
                  const rollout =
                    currentFlag.rollout ?? definition.defaultRollout;

                  return (
                    <div
                      key={flagKey}
                      className="flex items-center justify-between p-4 border rounded"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{definition.name}</h4>
                          {definition.devOnly && (
                            <Badge variant="secondary">Dev Only</Badge>
                          )}
                          <Badge variant={isEnabled ? 'default' : 'secondary'}>
                            {rollout}% rollout
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {definition.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 ml-4">
                        <div className="w-32">
                          <div className="text-xs mb-1">
                            Rollout: {rollout}%
                          </div>
                          <Slider
                            value={[rollout]}
                            onValueChange={([value]) =>
                              handleRolloutChange(flagKey, value)
                            }
                            max={100}
                            step={5}
                            disabled={!isEnabled}
                          />
                        </div>

                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleFlagToggle(flagKey)}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Flag Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>
              <strong>Total Flags:</strong>{' '}
              {Object.keys(flagDefinitions).length}
            </div>
            <div>
              <strong>Enabled:</strong>{' '}
              {Object.values(flags).filter((f) => f.enabled).length}
            </div>
            <div>
              <strong>Partial Rollout:</strong>{' '}
              {
                Object.values(flags).filter((f) => f.enabled && f.rollout < 100)
                  .length
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureFlagPanel;
