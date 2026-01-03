import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Adversary,
  Detection,
  TacticEvent,
  DefenseStrategy,
  SimulationScenario,
  AdversarialFilters,
  ThreatLevel,
  DetectionStatus,
  MitreTactic,
} from '../types';

export interface UseAdversarialOptions {
  initialAdversaries?: Adversary[];
  initialDetections?: Detection[];
  initialTacticEvents?: TacticEvent[];
  initialStrategies?: DefenseStrategy[];
  initialSimulations?: SimulationScenario[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAdversarialReturn {
  // Data
  adversaries: Adversary[];
  detections: Detection[];
  tacticEvents: TacticEvent[];
  defenseStrategies: DefenseStrategy[];
  simulations: SimulationScenario[];

  // Filtered data
  filteredAdversaries: Adversary[];
  filteredDetections: Detection[];

  // Selection
  selectedAdversary: Adversary | null;
  selectedDetection: Detection | null;
  selectAdversary: (id: string | null) => void;
  selectDetection: (id: string | null) => void;

  // Filters
  filters: AdversarialFilters;
  setFilters: (filters: AdversarialFilters) => void;
  clearFilters: () => void;

  // Actions
  updateDetectionStatus: (id: string, status: DetectionStatus) => void;
  startSimulation: (id: string) => void;
  stopSimulation: (id: string) => void;

  // Stats
  stats: {
    totalAdversaries: number;
    activeAdversaries: number;
    totalDetections: number;
    criticalDetections: number;
    highDetections: number;
    unresolvedDetections: number;
    detectionsByTactic: Record<MitreTactic, number>;
    coverageByThreatLevel: Record<ThreatLevel, number>;
  };

  // Loading state
  isLoading: boolean;
  error: string | null;
}

export function useAdversarial(options: UseAdversarialOptions = {}): UseAdversarialReturn {
  const {
    initialAdversaries = [],
    initialDetections = [],
    initialTacticEvents = [],
    initialStrategies = [],
    initialSimulations = [],
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  // State
  const [adversaries, setAdversaries] = useState<Adversary[]>(initialAdversaries);
  const [detections, setDetections] = useState<Detection[]>(initialDetections);
  const [tacticEvents, setTacticEvents] = useState<TacticEvent[]>(initialTacticEvents);
  const [defenseStrategies, setDefenseStrategies] = useState<DefenseStrategy[]>(initialStrategies);
  const [simulations, setSimulations] = useState<SimulationScenario[]>(initialSimulations);

  const [selectedAdversaryId, setSelectedAdversaryId] = useState<string | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdversarialFilters>({});
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Update state when initial values change
  useEffect(() => {
    setAdversaries(initialAdversaries);
  }, [initialAdversaries]);

  useEffect(() => {
    setDetections(initialDetections);
  }, [initialDetections]);

  useEffect(() => {
    setTacticEvents(initialTacticEvents);
  }, [initialTacticEvents]);

  useEffect(() => {
    setDefenseStrategies(initialStrategies);
  }, [initialStrategies]);

  useEffect(() => {
    setSimulations(initialSimulations);
  }, [initialSimulations]);

  // Filtered adversaries
  const filteredAdversaries = useMemo(() => {
    let result = [...adversaries];

    if (filters.threatLevel?.length) {
      result = result.filter((a) => filters.threatLevel?.includes(a.threatLevel));
    }

    if (filters.adversaryType?.length) {
      result = result.filter((a) => filters.adversaryType?.includes(a.type));
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.aliases.some((alias) => alias.toLowerCase().includes(query)) ||
          a.description.toLowerCase().includes(query)
      );
    }

    if (filters.tags?.length) {
      result = result.filter((a) => a.tags.some((tag) => filters.tags?.includes(tag)));
    }

    return result;
  }, [adversaries, filters]);

  // Filtered detections
  const filteredDetections = useMemo(() => {
    let result = [...detections];

    if (filters.tactics?.length) {
      result = result.filter((d) => filters.tactics?.includes(d.tactic));
    }

    if (filters.status?.length) {
      result = result.filter((d) => filters.status?.includes(d.status));
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      result = result.filter((d) => {
        const date = new Date(d.timestamp);
        return date >= start && date <= end;
      });
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.technique.toLowerCase().includes(query)
      );
    }

    return result;
  }, [detections, filters]);

  // Selected items
  const selectedAdversary = useMemo(
    () => adversaries.find((a) => a.id === selectedAdversaryId) || null,
    [adversaries, selectedAdversaryId]
  );

  const selectedDetection = useMemo(
    () => detections.find((d) => d.id === selectedDetectionId) || null,
    [detections, selectedDetectionId]
  );

  // Stats
  const stats = useMemo(() => {
    const detectionsByTactic = detections.reduce(
      (acc, d) => {
        acc[d.tactic] = (acc[d.tactic] || 0) + 1;
        return acc;
      },
      {} as Record<MitreTactic, number>
    );

    const coverageByThreatLevel: Record<ThreatLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    adversaries.forEach((adversary) => {
      const coveredTechniques = defenseStrategies.reduce((count, strategy) => {
        return count + strategy.techniques.filter((t) => adversary.techniques.includes(t)).length;
      }, 0);
      const coverage =
        adversary.techniques.length > 0
          ? Math.round((coveredTechniques / adversary.techniques.length) * 100)
          : 0;
      coverageByThreatLevel[adversary.threatLevel] =
        (coverageByThreatLevel[adversary.threatLevel] || 0) + coverage;
    });

    return {
      totalAdversaries: adversaries.length,
      activeAdversaries: adversaries.filter((a) => a.active).length,
      totalDetections: detections.length,
      criticalDetections: detections.filter((d) => d.severity === 'critical').length,
      highDetections: detections.filter((d) => d.severity === 'high').length,
      unresolvedDetections: detections.filter(
        (d) => d.status !== 'resolved' && d.status !== 'false-positive'
      ).length,
      detectionsByTactic,
      coverageByThreatLevel,
    };
  }, [adversaries, detections, defenseStrategies]);

  // Actions
  const selectAdversary = useCallback((id: string | null) => {
    setSelectedAdversaryId(id);
  }, []);

  const selectDetection = useCallback((id: string | null) => {
    setSelectedDetectionId(id);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const updateDetectionStatus = useCallback((id: string, status: DetectionStatus) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  }, []);

  const startSimulation = useCallback((id: string) => {
    setSimulations((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: 'running', startedAt: new Date().toISOString() } : s
      )
    );
  }, []);

  const stopSimulation = useCallback((id: string) => {
    setSimulations((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: 'cancelled', completedAt: new Date().toISOString() } : s
      )
    );
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      // Refresh logic would go here - placeholder for future implementation
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]);

  return {
    // Data
    adversaries,
    detections,
    tacticEvents,
    defenseStrategies,
    simulations,

    // Filtered data
    filteredAdversaries,
    filteredDetections,

    // Selection
    selectedAdversary,
    selectedDetection,
    selectAdversary,
    selectDetection,

    // Filters
    filters,
    setFilters,
    clearFilters,

    // Actions
    updateDetectionStatus,
    startSimulation,
    stopSimulation,

    // Stats
    stats,

    // Loading state
    isLoading,
    error,
  };
}

export default useAdversarial;
