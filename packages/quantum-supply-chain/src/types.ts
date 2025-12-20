import { z } from 'zod';

/**
 * Quantum-Inspired Optimization Types
 */

export const OptimizationProblemTypeSchema = z.enum([
  'vehicle_routing',
  'facility_location',
  'production_scheduling',
  'inventory_allocation',
  'network_design',
  'multi_echelon_optimization',
  'portfolio_optimization',
  'resource_allocation',
]);

export const QuantumAlgorithmSchema = z.enum([
  'qaoa', // Quantum Approximate Optimization Algorithm
  'vqe', // Variational Quantum Eigensolver
  'quantum_annealing',
  'grover_search',
  'quantum_walk',
  'quantum_inspired_evolutionary',
]);

export const OptimizationProblemSchema = z.object({
  id: z.string(),
  problemType: OptimizationProblemTypeSchema,
  tenantId: z.string(),

  // Problem definition
  objectiveFunction: z.string(), // Mathematical expression
  constraints: z.array(z.object({
    constraintId: z.string(),
    type: z.enum(['equality', 'inequality', 'bound']),
    expression: z.string(),
    importance: z.enum(['hard', 'soft']),
  })),

  // Decision variables
  variables: z.array(z.object({
    variableId: z.string(),
    name: z.string(),
    type: z.enum(['continuous', 'integer', 'binary']),
    lowerBound: z.number().optional(),
    upperBound: z.number().optional(),
    initialValue: z.number().optional(),
  })),

  // Problem size
  dimensions: z.object({
    variables: z.number(),
    constraints: z.number(),
    complexity: z.enum(['low', 'medium', 'high', 'extreme']),
  }),

  // Data
  parameters: z.record(z.string(), z.any()),

  createdAt: z.string().datetime(),
});

export type OptimizationProblem = z.infer<typeof OptimizationProblemSchema>;
export type OptimizationProblemType = z.infer<typeof OptimizationProblemTypeSchema>;
export type QuantumAlgorithm = z.infer<typeof QuantumAlgorithmSchema>;

export const QuantumOptimizationResultSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  tenantId: z.string(),

  // Solution
  optimalSolution: z.object({
    variables: z.record(z.string(), z.number()),
    objectiveValue: z.number(),
    feasible: z.boolean(),
    quality: z.number().min(0).max(100), // How close to theoretical optimum
  }),

  // Alternative solutions (Pareto front for multi-objective)
  alternativeSolutions: z.array(z.object({
    rank: z.number(),
    variables: z.record(z.string(), z.number()),
    objectiveValue: z.number(),
    tradeoffs: z.string(),
  })).optional(),

  // Algorithm performance
  algorithmUsed: QuantumAlgorithmSchema,
  performance: z.object({
    iterations: z.number(),
    convergenceRate: z.number(),
    executionTime: z.number(), // milliseconds
    quantumAdvantage: z.number(), // Speedup vs classical
    energyEfficiency: z.number().optional(),
  }),

  // Solution quality metrics
  metrics: z.object({
    optimality Gap: z.number(), // % from theoretical optimum
    constraintViolations: z.number(),
    robustness: z.number(), // Sensitivity to parameter changes
    stability: z.number(), // Solution stability
  }),

  // Uncertainty quantification
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    confidence: z.number(),
  }).optional(),

  // Sensitivity analysis
  sensitivityAnalysis: z.array(z.object({
    parameter: z.string(),
    elasticity: z.number(), // % change in objective per % change in parameter
    criticalRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
  })).optional(),

  // Recommendations
  insights: z.array(z.string()),
  implementationPlan: z.array(z.object({
    step: z.string(),
    timeline: z.string(),
    dependencies: z.array(z.string()),
    expectedImpact: z.number(),
  })),

  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type QuantumOptimizationResult = z.infer<typeof QuantumOptimizationResultSchema>;

/**
 * Vehicle Routing Problem (VRP) with Quantum
 */
export const QuantumVRPSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Vehicles
  vehicles: z.array(z.object({
    vehicleId: z.string(),
    capacity: z.number(),
    costPerKm: z.number(),
    maxDistance: z.number().optional(),
    startLocation: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    endLocation: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    timeWindows: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })).optional(),
  })),

  // Delivery locations
  deliveries: z.array(z.object({
    deliveryId: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    demand: z.number(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    timeWindow: z.object({
      earliest: z.string(),
      latest: z.string(),
    }).optional(),
    serviceTime: z.number(), // minutes
  })),

  // Objectives
  objectives: z.array(z.enum([
    'minimize_distance',
    'minimize_cost',
    'minimize_vehicles',
    'minimize_time',
    'maximize_service_level',
    'balance_workload',
  ])),

  // Constraints
  constraints: z.object({
    maxRouteTime: z.number().optional(),
    maxStopsPerRoute: z.number().optional(),
    mustVisitAll: z.boolean(),
    vehicleCompatibility: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
});

export type QuantumVRP = z.infer<typeof QuantumVRPSchema>;

export const VRPSolutionSchema = z.object({
  problemId: z.string(),

  routes: z.array(z.object({
    vehicleId: z.string(),
    stops: z.array(z.object({
      deliveryId: z.string(),
      arrivalTime: z.string(),
      departureTime: z.string(),
      waitTime: z.number(),
    })),
    totalDistance: z.number(),
    totalCost: z.number(),
    totalTime: z.number(),
    utilization: z.number(), // % of capacity used
  })),

  summary: z.object({
    totalDistance: z.number(),
    totalCost: z.number(),
    totalTime: z.number(),
    vehiclesUsed: z.number(),
    deliveriesCompleted: z.number(),
    serviceLevel: z.number(),
  }),

  optimizationQuality: z.number().min(0).max(100),
  generatedAt: z.string().datetime(),
});

export type VRPSolution = z.infer<typeof VRPSolutionSchema>;

/**
 * Network Design Optimization
 */
export const NetworkDesignProblemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Potential facility locations
  candidateFacilities: z.array(z.object({
    facilityId: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    fixedCost: z.number(),
    capacity: z.number(),
    operatingCost: z.number(), // per unit
  })),

  // Demand points
  demandPoints: z.array(z.object({
    pointId: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    demand: z.number(),
    priority: z.number(),
  })),

  // Transportation costs
  transportationCosts: z.record(z.string(), z.record(z.string(), z.number())), // facility -> demand point

  // Objectives
  objectives: z.array(z.enum([
    'minimize_total_cost',
    'minimize_max_distance',
    'maximize_coverage',
    'minimize_facilities',
    'balance_load',
  ])),

  // Constraints
  constraints: z.object({
    maxFacilities: z.number().optional(),
    minCoverage: z.number().optional(), // %
    maxDistanceToCustomer: z.number().optional(),
    budget: z.number().optional(),
  }).optional(),
});

export type NetworkDesignProblem = z.infer<typeof NetworkDesignProblemSchema>;

export const NetworkDesignSolutionSchema = z.object({
  problemId: z.string(),

  selectedFacilities: z.array(z.object({
    facilityId: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    assignedDemand: z.number(),
    utilization: z.number(),
    totalCost: z.number(),
  })),

  assignments: z.array(z.object({
    demandPointId: z.string(),
    facilityId: z.string(),
    distance: z.number(),
    cost: z.number(),
  })),

  summary: z.object({
    facilitiesOpened: z.number(),
    totalFixedCost: z.number(),
    totalOperatingCost: z.number(),
    totalTransportationCost: z.number(),
    totalCost: z.number(),
    coverage: z.number(), // % of demand covered
    avgDistanceToCustomer: z.number(),
  }),

  optimizationQuality: z.number().min(0).max(100),
  generatedAt: z.string().datetime(),
});

export type NetworkDesignSolution = z.infer<typeof NetworkDesignSolutionSchema>;

/**
 * Multi-Objective Optimization Result
 */
export const ParetoFrontSchema = z.object({
  problemId: z.string(),

  solutions: z.array(z.object({
    solutionId: z.string(),
    objectives: z.record(z.string(), z.number()), // objective name -> value
    variables: z.record(z.string(), z.number()),
    dominanceRank: z.number(),
    crowdingDistance: z.number(),
  })),

  tradeoffAnalysis: z.array(z.object({
    objective1: z.string(),
    objective2: z.string(),
    tradeoffRate: z.number(), // How much obj1 improves per unit sacrifice in obj2
    analysis: z.string(),
  })),

  recommendations: z.array(z.object({
    solutionId: z.string(),
    scenario: z.string(),
    rationale: z.string(),
    expectedOutcomes: z.record(z.string(), z.string()),
  })),

  generatedAt: z.string().datetime(),
});

export type ParetoFront = z.infer<typeof ParetoFrontSchema>;
