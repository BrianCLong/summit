import { renderHook, act } from '@testing-library/react';
import { useAdversarial } from '../hooks/useAdversarial';
import { mockAdversaries, mockDetections, mockDefenseStrategies } from '../fixtures';

describe('useAdversarial', () => {
  it('initializes with provided data', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
        initialDetections: mockDetections,
        initialStrategies: mockDefenseStrategies,
      })
    );

    expect(result.current.adversaries).toEqual(mockAdversaries);
    expect(result.current.detections).toEqual(mockDetections);
    expect(result.current.defenseStrategies).toEqual(mockDefenseStrategies);
  });

  it('calculates stats correctly', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
        initialDetections: mockDetections,
      })
    );

    expect(result.current.stats.totalAdversaries).toBe(mockAdversaries.length);
    expect(result.current.stats.activeAdversaries).toBe(
      mockAdversaries.filter(a => a.active).length
    );
    expect(result.current.stats.totalDetections).toBe(mockDetections.length);
    expect(result.current.stats.criticalDetections).toBe(
      mockDetections.filter(d => d.severity === 'critical').length
    );
  });

  it('filters adversaries by threat level', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
      })
    );

    act(() => {
      result.current.setFilters({ threatLevel: ['critical'] });
    });

    expect(result.current.filteredAdversaries.every(a => a.threatLevel === 'critical')).toBe(true);
  });

  it('filters adversaries by search query', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
      })
    );

    act(() => {
      result.current.setFilters({ searchQuery: 'APT29' });
    });

    expect(result.current.filteredAdversaries.length).toBe(1);
    expect(result.current.filteredAdversaries[0].name).toBe('APT29');
  });

  it('filters detections by tactic', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialDetections: mockDetections,
      })
    );

    act(() => {
      result.current.setFilters({ tactics: ['execution'] });
    });

    expect(result.current.filteredDetections.every(d => d.tactic === 'execution')).toBe(true);
  });

  it('selects and deselects adversary', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
      })
    );

    expect(result.current.selectedAdversary).toBeNull();

    act(() => {
      result.current.selectAdversary(mockAdversaries[0].id);
    });

    expect(result.current.selectedAdversary).toEqual(mockAdversaries[0]);

    act(() => {
      result.current.selectAdversary(null);
    });

    expect(result.current.selectedAdversary).toBeNull();
  });

  it('selects and deselects detection', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialDetections: mockDetections,
      })
    );

    expect(result.current.selectedDetection).toBeNull();

    act(() => {
      result.current.selectDetection(mockDetections[0].id);
    });

    expect(result.current.selectedDetection).toEqual(mockDetections[0]);

    act(() => {
      result.current.selectDetection(null);
    });

    expect(result.current.selectedDetection).toBeNull();
  });

  it('updates detection status', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialDetections: mockDetections,
      })
    );

    const detectionId = mockDetections[0].id;

    act(() => {
      result.current.updateDetectionStatus(detectionId, 'resolved');
    });

    const updatedDetection = result.current.detections.find(d => d.id === detectionId);
    expect(updatedDetection?.status).toBe('resolved');
  });

  it('clears filters', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
      })
    );

    act(() => {
      result.current.setFilters({ threatLevel: ['critical'], searchQuery: 'test' });
    });

    expect(result.current.filters).toEqual({ threatLevel: ['critical'], searchQuery: 'test' });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });

  it('starts simulation', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialSimulations: [
          {
            id: 'sim-1',
            name: 'Test Simulation',
            description: 'Test',
            techniques: ['T1059.001'],
            objectives: ['Test objective'],
            status: 'pending',
          },
        ],
      })
    );

    act(() => {
      result.current.startSimulation('sim-1');
    });

    const simulation = result.current.simulations.find(s => s.id === 'sim-1');
    expect(simulation?.status).toBe('running');
    expect(simulation?.startedAt).toBeDefined();
  });

  it('stops simulation', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialSimulations: [
          {
            id: 'sim-1',
            name: 'Test Simulation',
            description: 'Test',
            techniques: ['T1059.001'],
            objectives: ['Test objective'],
            status: 'running',
            startedAt: new Date().toISOString(),
          },
        ],
      })
    );

    act(() => {
      result.current.stopSimulation('sim-1');
    });

    const simulation = result.current.simulations.find(s => s.id === 'sim-1');
    expect(simulation?.status).toBe('cancelled');
    expect(simulation?.completedAt).toBeDefined();
  });

  it('calculates detection counts by tactic', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialDetections: mockDetections,
      })
    );

    const detectionsByTactic = result.current.stats.detectionsByTactic;

    mockDetections.forEach(detection => {
      expect(detectionsByTactic[detection.tactic]).toBeGreaterThanOrEqual(1);
    });
  });

  it('initializes without data', () => {
    const { result } = renderHook(() => useAdversarial());

    expect(result.current.adversaries).toEqual([]);
    expect(result.current.detections).toEqual([]);
    expect(result.current.stats.totalAdversaries).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('filters by multiple adversary types', () => {
    const { result } = renderHook(() =>
      useAdversarial({
        initialAdversaries: mockAdversaries,
      })
    );

    act(() => {
      result.current.setFilters({ adversaryType: ['nation-state', 'cybercrime'] });
    });

    expect(
      result.current.filteredAdversaries.every(
        a => a.type === 'nation-state' || a.type === 'cybercrime'
      )
    ).toBe(true);
  });
});
