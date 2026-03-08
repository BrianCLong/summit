"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParetoFrontSchema = exports.NetworkDesignSolutionSchema = exports.NetworkDesignProblemSchema = exports.VRPSolutionSchema = exports.QuantumVRPSchema = exports.QuantumOptimizationResultSchema = exports.OptimizationProblemSchema = exports.QuantumAlgorithmSchema = exports.OptimizationProblemTypeSchema = void 0;
const zod_1 = require("zod");
/**
 * Quantum-Inspired Optimization Types
 */
exports.OptimizationProblemTypeSchema = zod_1.z.enum([
    'vehicle_routing',
    'facility_location',
    'production_scheduling',
    'inventory_allocation',
    'network_design',
    'multi_echelon_optimization',
    'portfolio_optimization',
    'resource_allocation',
]);
exports.QuantumAlgorithmSchema = zod_1.z.enum([
    'qaoa', // Quantum Approximate Optimization Algorithm
    'vqe', // Variational Quantum Eigensolver
    'quantum_annealing',
    'grover_search',
    'quantum_walk',
    'quantum_inspired_evolutionary',
]);
exports.OptimizationProblemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    problemType: exports.OptimizationProblemTypeSchema,
    tenantId: zod_1.z.string(),
    // Problem definition
    objectiveFunction: zod_1.z.string(), // Mathematical expression
    constraints: zod_1.z.array(zod_1.z.object({
        constraintId: zod_1.z.string(),
        type: zod_1.z.enum(['equality', 'inequality', 'bound']),
        expression: zod_1.z.string(),
        importance: zod_1.z.enum(['hard', 'soft']),
    })),
    // Decision variables
    variables: zod_1.z.array(zod_1.z.object({
        variableId: zod_1.z.string(),
        name: zod_1.z.string(),
        type: zod_1.z.enum(['continuous', 'integer', 'binary']),
        lowerBound: zod_1.z.number().optional(),
        upperBound: zod_1.z.number().optional(),
        initialValue: zod_1.z.number().optional(),
    })),
    // Problem size
    dimensions: zod_1.z.object({
        variables: zod_1.z.number(),
        constraints: zod_1.z.number(),
        complexity: zod_1.z.enum(['low', 'medium', 'high', 'extreme']),
    }),
    // Data
    parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    createdAt: zod_1.z.string().datetime(),
});
exports.QuantumOptimizationResultSchema = zod_1.z.object({
    id: zod_1.z.string(),
    problemId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Solution
    optimalSolution: zod_1.z.object({
        variables: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        objectiveValue: zod_1.z.number(),
        feasible: zod_1.z.boolean(),
        quality: zod_1.z.number().min(0).max(100), // How close to theoretical optimum
    }),
    // Alternative solutions (Pareto front for multi-objective)
    alternativeSolutions: zod_1.z.array(zod_1.z.object({
        rank: zod_1.z.number(),
        variables: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        objectiveValue: zod_1.z.number(),
        tradeoffs: zod_1.z.string(),
    })).optional(),
    // Algorithm performance
    algorithmUsed: exports.QuantumAlgorithmSchema,
    performance: zod_1.z.object({
        iterations: zod_1.z.number(),
        convergenceRate: zod_1.z.number(),
        executionTime: zod_1.z.number(), // milliseconds
        quantumAdvantage: zod_1.z.number(), // Speedup vs classical
        energyEfficiency: zod_1.z.number().optional(),
    }),
    // Solution quality metrics
    metrics: zod_1.z.object({
        optimality, Gap: zod_1.z.number(), // % from theoretical optimum
        constraintViolations: zod_1.z.number(),
        robustness: zod_1.z.number(), // Sensitivity to parameter changes
        stability: zod_1.z.number(), // Solution stability
    }),
    // Uncertainty quantification
    confidenceInterval: zod_1.z.object({
        lower: zod_1.z.number(),
        upper: zod_1.z.number(),
        confidence: zod_1.z.number(),
    }).optional(),
    // Sensitivity analysis
    sensitivityAnalysis: zod_1.z.array(zod_1.z.object({
        parameter: zod_1.z.string(),
        elasticity: zod_1.z.number(), // % change in objective per % change in parameter
        criticalRange: zod_1.z.object({
            min: zod_1.z.number(),
            max: zod_1.z.number(),
        }),
    })).optional(),
    // Recommendations
    insights: zod_1.z.array(zod_1.z.string()),
    implementationPlan: zod_1.z.array(zod_1.z.object({
        step: zod_1.z.string(),
        timeline: zod_1.z.string(),
        dependencies: zod_1.z.array(zod_1.z.string()),
        expectedImpact: zod_1.z.number(),
    })),
    generatedAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime(),
});
/**
 * Vehicle Routing Problem (VRP) with Quantum
 */
exports.QuantumVRPSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Vehicles
    vehicles: zod_1.z.array(zod_1.z.object({
        vehicleId: zod_1.z.string(),
        capacity: zod_1.z.number(),
        costPerKm: zod_1.z.number(),
        maxDistance: zod_1.z.number().optional(),
        startLocation: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }),
        endLocation: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }).optional(),
        timeWindows: zod_1.z.array(zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string(),
        })).optional(),
    })),
    // Delivery locations
    deliveries: zod_1.z.array(zod_1.z.object({
        deliveryId: zod_1.z.string(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }),
        demand: zod_1.z.number(),
        priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']),
        timeWindow: zod_1.z.object({
            earliest: zod_1.z.string(),
            latest: zod_1.z.string(),
        }).optional(),
        serviceTime: zod_1.z.number(), // minutes
    })),
    // Objectives
    objectives: zod_1.z.array(zod_1.z.enum([
        'minimize_distance',
        'minimize_cost',
        'minimize_vehicles',
        'minimize_time',
        'maximize_service_level',
        'balance_workload',
    ])),
    // Constraints
    constraints: zod_1.z.object({
        maxRouteTime: zod_1.z.number().optional(),
        maxStopsPerRoute: zod_1.z.number().optional(),
        mustVisitAll: zod_1.z.boolean(),
        vehicleCompatibility: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
    }).optional(),
});
exports.VRPSolutionSchema = zod_1.z.object({
    problemId: zod_1.z.string(),
    routes: zod_1.z.array(zod_1.z.object({
        vehicleId: zod_1.z.string(),
        stops: zod_1.z.array(zod_1.z.object({
            deliveryId: zod_1.z.string(),
            arrivalTime: zod_1.z.string(),
            departureTime: zod_1.z.string(),
            waitTime: zod_1.z.number(),
        })),
        totalDistance: zod_1.z.number(),
        totalCost: zod_1.z.number(),
        totalTime: zod_1.z.number(),
        utilization: zod_1.z.number(), // % of capacity used
    })),
    summary: zod_1.z.object({
        totalDistance: zod_1.z.number(),
        totalCost: zod_1.z.number(),
        totalTime: zod_1.z.number(),
        vehiclesUsed: zod_1.z.number(),
        deliveriesCompleted: zod_1.z.number(),
        serviceLevel: zod_1.z.number(),
    }),
    optimizationQuality: zod_1.z.number().min(0).max(100),
    generatedAt: zod_1.z.string().datetime(),
});
/**
 * Network Design Optimization
 */
exports.NetworkDesignProblemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    // Potential facility locations
    candidateFacilities: zod_1.z.array(zod_1.z.object({
        facilityId: zod_1.z.string(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }),
        fixedCost: zod_1.z.number(),
        capacity: zod_1.z.number(),
        operatingCost: zod_1.z.number(), // per unit
    })),
    // Demand points
    demandPoints: zod_1.z.array(zod_1.z.object({
        pointId: zod_1.z.string(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }),
        demand: zod_1.z.number(),
        priority: zod_1.z.number(),
    })),
    // Transportation costs
    transportationCosts: zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), zod_1.z.number())), // facility -> demand point
    // Objectives
    objectives: zod_1.z.array(zod_1.z.enum([
        'minimize_total_cost',
        'minimize_max_distance',
        'maximize_coverage',
        'minimize_facilities',
        'balance_load',
    ])),
    // Constraints
    constraints: zod_1.z.object({
        maxFacilities: zod_1.z.number().optional(),
        minCoverage: zod_1.z.number().optional(), // %
        maxDistanceToCustomer: zod_1.z.number().optional(),
        budget: zod_1.z.number().optional(),
    }).optional(),
});
exports.NetworkDesignSolutionSchema = zod_1.z.object({
    problemId: zod_1.z.string(),
    selectedFacilities: zod_1.z.array(zod_1.z.object({
        facilityId: zod_1.z.string(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lng: zod_1.z.number(),
        }),
        assignedDemand: zod_1.z.number(),
        utilization: zod_1.z.number(),
        totalCost: zod_1.z.number(),
    })),
    assignments: zod_1.z.array(zod_1.z.object({
        demandPointId: zod_1.z.string(),
        facilityId: zod_1.z.string(),
        distance: zod_1.z.number(),
        cost: zod_1.z.number(),
    })),
    summary: zod_1.z.object({
        facilitiesOpened: zod_1.z.number(),
        totalFixedCost: zod_1.z.number(),
        totalOperatingCost: zod_1.z.number(),
        totalTransportationCost: zod_1.z.number(),
        totalCost: zod_1.z.number(),
        coverage: zod_1.z.number(), // % of demand covered
        avgDistanceToCustomer: zod_1.z.number(),
    }),
    optimizationQuality: zod_1.z.number().min(0).max(100),
    generatedAt: zod_1.z.string().datetime(),
});
/**
 * Multi-Objective Optimization Result
 */
exports.ParetoFrontSchema = zod_1.z.object({
    problemId: zod_1.z.string(),
    solutions: zod_1.z.array(zod_1.z.object({
        solutionId: zod_1.z.string(),
        objectives: zod_1.z.record(zod_1.z.string(), zod_1.z.number()), // objective name -> value
        variables: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        dominanceRank: zod_1.z.number(),
        crowdingDistance: zod_1.z.number(),
    })),
    tradeoffAnalysis: zod_1.z.array(zod_1.z.object({
        objective1: zod_1.z.string(),
        objective2: zod_1.z.string(),
        tradeoffRate: zod_1.z.number(), // How much obj1 improves per unit sacrifice in obj2
        analysis: zod_1.z.string(),
    })),
    recommendations: zod_1.z.array(zod_1.z.object({
        solutionId: zod_1.z.string(),
        scenario: zod_1.z.string(),
        rationale: zod_1.z.string(),
        expectedOutcomes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    })),
    generatedAt: zod_1.z.string().datetime(),
});
