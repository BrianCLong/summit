import { z } from 'zod';

/**
 * Shipment Tracking
 */
export const TransportModeSchema = z.enum([
  'air',
  'ocean',
  'rail',
  'truck',
  'courier',
  'multimodal',
]);

export const ShipmentStatusSchema = z.enum([
  'preparing',
  'in_transit',
  'at_port',
  'customs_clearance',
  'out_for_delivery',
  'delivered',
  'delayed',
  'exception',
  'lost',
  'returned',
]);

export const ShipmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Identification
  trackingNumber: z.string(),
  referenceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),

  // Parties
  shipper: z.object({
    name: z.string(),
    address: z.string(),
    country: z.string(),
    contactEmail: z.string().email().optional(),
  }),

  consignee: z.object({
    name: z.string(),
    address: z.string(),
    country: z.string(),
    contactEmail: z.string().email().optional(),
  }),

  // Carrier
  carrier: z.object({
    id: z.string(),
    name: z.string(),
    scac: z.string().optional(), // Standard Carrier Alpha Code
  }),

  // Transport details
  transportMode: TransportModeSchema,
  serviceLevel: z.string().optional(), // e.g., "Express", "Standard", "Economy"

  // Cargo
  cargo: z.object({
    description: z.string(),
    componentIds: z.array(z.string()).optional(),
    weight: z.number().optional(),
    weightUnit: z.string().optional(),
    volume: z.number().optional(),
    volumeUnit: z.string().optional(),
    packageCount: z.number(),
    declaredValue: z.number().optional(),
    currency: z.string().optional(),
  }),

  // Special handling
  temperatureControlled: z.boolean().optional(),
  targetTemperatureRange: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.string(),
  }).optional(),

  hazardousMaterial: z.boolean().optional(),
  hazardClass: z.string().optional(),

  // Status
  status: ShipmentStatusSchema,
  currentLocation: z.object({
    city: z.string().optional(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),

  // Timeline
  pickupDate: z.string().datetime().optional(),
  estimatedDeliveryDate: z.string().datetime(),
  actualDeliveryDate: z.string().datetime().optional(),

  // Performance
  onTimePerformance: z.boolean().optional(),
  delayReason: z.string().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ShipmentEventSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),

  timestamp: z.string().datetime(),
  eventType: z.string(), // e.g., "Picked up", "Departed", "Arrived", "Delivered"
  eventCode: z.string().optional(),

  location: z.object({
    city: z.string().optional(),
    country: z.string(),
    facility: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),

  description: z.string(),

  // Exception handling
  isException: z.boolean().default(false),
  exceptionType: z.string().optional(),

  createdAt: z.string().datetime(),
});

export type Shipment = z.infer<typeof ShipmentSchema>;
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;
export type TransportMode = z.infer<typeof TransportModeSchema>;
export type ShipmentEvent = z.infer<typeof ShipmentEventSchema>;

/**
 * Carrier Performance Monitoring
 */
export const CarrierSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  name: z.string(),
  scac: z.string().optional(),
  iataCode: z.string().optional(),

  // Services
  servicesOffered: z.array(TransportModeSchema),
  geographicCoverage: z.array(z.string()), // Countries

  // Performance metrics
  performanceMetrics: z.object({
    onTimeDeliveryRate: z.number().min(0).max(100),
    averageTransitTime: z.number(), // days
    claimRate: z.number(), // per 1000 shipments
    damageRate: z.number(), // percentage
    lossRate: z.number(), // percentage
    customerSatisfactionScore: z.number().min(0).max(100).optional(),
  }).optional(),

  // Rating
  overallRating: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),

  // Contract
  hasContract: z.boolean(),
  contractId: z.string().optional(),

  status: z.enum(['active', 'inactive', 'suspended']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CarrierPerformanceReportSchema = z.object({
  id: z.string(),
  carrierId: z.string(),
  tenantId: z.string(),

  reportingPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),

  // Shipment statistics
  totalShipments: z.number(),
  onTimeShipments: z.number(),
  delayedShipments: z.number(),
  lostShipments: z.number(),

  // Performance KPIs
  onTimeDeliveryRate: z.number().min(0).max(100),
  averageDelay: z.number(), // days
  averageTransitTime: z.number(), // days

  // Quality metrics
  damageIncidents: z.number(),
  claimsFiled: z.number(),
  claimsValue: z.number().optional(),

  // Cost efficiency
  averageCostPerShipment: z.number().optional(),
  totalShippingCost: z.number().optional(),

  // Issues
  topIssues: z.array(z.object({
    issue: z.string(),
    occurrences: z.number(),
    impact: z.enum(['critical', 'high', 'medium', 'low']),
  })).optional(),

  // Recommendations
  performanceRating: z.enum(['excellent', 'good', 'acceptable', 'poor']),
  recommendations: z.array(z.string()),

  generatedAt: z.string().datetime(),
});

export type Carrier = z.infer<typeof CarrierSchema>;
export type CarrierPerformanceReport = z.infer<typeof CarrierPerformanceReportSchema>;

/**
 * Route Intelligence
 */
export const RouteSegmentSchema = z.object({
  origin: z.object({
    city: z.string(),
    country: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),
  destination: z.object({
    city: z.string(),
    country: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),
  transportMode: TransportModeSchema,
  estimatedTransitTime: z.number(), // hours
  distance: z.number().optional(), // km
});

export const RouteRiskSchema = z.object({
  riskType: z.enum([
    'weather',
    'port_congestion',
    'customs_delay',
    'political_instability',
    'piracy',
    'theft',
    'infrastructure',
    'capacity_constraints',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  probability: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
  description: z.string(),
  affectedSegments: z.array(z.number()), // Indices of affected route segments
  mitigationActions: z.array(z.string()).optional(),
});

export const RouteAnalysisSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  routeName: z.string().optional(),
  segments: z.array(RouteSegmentSchema),

  // Route characteristics
  totalTransitTime: z.number(), // hours
  totalDistance: z.number().optional(), // km
  estimatedCost: z.number().optional(),

  // Risk assessment
  risks: z.array(RouteRiskSchema),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),

  // Performance
  reliability: z.number().min(0).max(100),
  historicalOnTimeRate: z.number().min(0).max(100).optional(),

  // Alternatives
  alternativeRoutes: z.array(z.string()).optional(), // IDs of alternative routes

  // Recommendations
  recommended: z.boolean(),
  recommendationReason: z.string().optional(),

  analysisDate: z.string().datetime(),
});

export type RouteSegment = z.infer<typeof RouteSegmentSchema>;
export type RouteRisk = z.infer<typeof RouteRiskSchema>;
export type RouteAnalysis = z.infer<typeof RouteAnalysisSchema>;

/**
 * Port and Logistics Hub Monitoring
 */
export const PortStatusSchema = z.enum([
  'normal',
  'congested',
  'severely_congested',
  'delayed',
  'closed',
  'reduced_operations',
]);

export const PortIntelligenceSchema = z.object({
  id: z.string(),
  portCode: z.string(), // UN/LOCODE
  portName: z.string(),
  country: z.string(),

  // Current status
  status: PortStatusSchema,
  congestionLevel: z.number().min(0).max(100),

  // Wait times
  averageWaitTime: z.number().optional(), // hours
  averageDwellTime: z.number().optional(), // hours

  // Capacity
  capacityUtilization: z.number().min(0).max(100).optional(),
  berthAvailability: z.number().min(0).max(100).optional(),

  // Disruptions
  activeDisruptions: z.array(z.object({
    type: z.enum([
      'weather',
      'strike',
      'equipment_failure',
      'security',
      'capacity',
      'other',
    ]),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    startDate: z.string().datetime(),
    estimatedEndDate: z.string().datetime().optional(),
  })).optional(),

  // Forecast
  forecastedCongestion: z.object({
    next7Days: z.number().min(0).max(100),
    next30Days: z.number().min(0).max(100),
  }).optional(),

  // Recommendations
  alternativePorts: z.array(z.object({
    portCode: z.string(),
    portName: z.string(),
    distanceKm: z.number(),
  })).optional(),

  lastUpdated: z.string().datetime(),
});

export type PortStatus = z.infer<typeof PortStatusSchema>;
export type PortIntelligence = z.infer<typeof PortIntelligenceSchema>;

/**
 * Customs and Border Crossing
 */
export const CustomsClearanceSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  tenantId: z.string(),

  // Location
  port: z.object({
    code: z.string(),
    name: z.string(),
    country: z.string(),
  }),

  // Documentation
  customsDeclarationNumber: z.string(),
  broker: z.object({
    name: z.string(),
    licenseNumber: z.string().optional(),
  }).optional(),

  // Classification
  hsCode: z.string(),
  customsValue: z.number(),
  currency: z.string(),

  // Duties and taxes
  dutyRate: z.number().optional(), // percentage
  dutyAmount: z.number().optional(),
  taxAmount: z.number().optional(),
  totalCustomsFees: z.number().optional(),

  // Status
  status: z.enum([
    'pending',
    'under_review',
    'inspection_required',
    'cleared',
    'held',
    'released',
    'rejected',
  ]),

  // Timeline
  submissionDate: z.string().datetime(),
  clearanceDate: z.string().datetime().optional(),
  estimatedClearanceDate: z.string().datetime().optional(),

  // Issues
  issues: z.array(z.object({
    issueType: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    resolved: z.boolean(),
  })).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CustomsClearance = z.infer<typeof CustomsClearanceSchema>;

/**
 * Carbon Footprint and Emissions Tracking
 */
export const EmissionsCalculationSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  tenantId: z.string(),

  // Transport details
  transportMode: TransportModeSchema,
  distance: z.number(), // km
  weight: z.number(), // kg

  // Emissions
  co2Emissions: z.number(), // kg CO2e
  emissionFactor: z.number(), // kg CO2e per ton-km

  // Methodology
  calculationMethod: z.string(),
  emissionStandard: z.string().optional(), // e.g., "GHG Protocol", "ISO 14064"

  // Offsets
  offsetsApplied: z.boolean(),
  offsetAmount: z.number().optional(),
  offsetCertificates: z.array(z.string()).optional(),

  calculationDate: z.string().datetime(),
});

export const CarbonFootprintReportSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  reportingPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),

  // Emissions by mode
  emissionsByMode: z.record(z.string(), z.number()), // TransportMode -> kg CO2e

  // Emissions by route
  emissionsByRoute: z.array(z.object({
    route: z.string(),
    emissions: z.number(),
    percentage: z.number(),
  })),

  // Totals
  totalEmissions: z.number(), // kg CO2e
  totalDistance: z.number(), // km
  averageEmissionsPerKm: z.number(),

  // Benchmarking
  industryAverage: z.number().optional(),
  performanceVsIndustry: z.number().optional(), // percentage

  // Reduction opportunities
  reductionOpportunities: z.array(z.object({
    opportunity: z.string(),
    estimatedReduction: z.number(), // kg CO2e
    implementation: z.string(),
  })).optional(),

  generatedAt: z.string().datetime(),
});

export type EmissionsCalculation = z.infer<typeof EmissionsCalculationSchema>;
export type CarbonFootprintReport = z.infer<typeof CarbonFootprintReportSchema>;

/**
 * Theft and Security Incidents
 */
export const SecurityIncidentSchema = z.object({
  id: z.string(),
  shipmentId: z.string().optional(),
  tenantId: z.string(),

  incidentType: z.enum([
    'theft',
    'hijacking',
    'tampering',
    'diversion',
    'smuggling',
    'vandalism',
    'piracy',
    'terrorism',
  ]),

  severity: z.enum(['critical', 'high', 'medium', 'low']),

  // Location
  location: z.object({
    city: z.string().optional(),
    country: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),

  // Details
  description: z.string(),
  incidentDate: z.string().datetime(),
  reportedDate: z.string().datetime(),

  // Impact
  cargoValue: z.number().optional(),
  cargoRecovered: z.boolean(),
  injuries: z.number().optional(),

  // Investigation
  investigationStatus: z.enum(['open', 'under_investigation', 'closed', 'referred']),
  lawEnforcementNotified: z.boolean(),
  insuranceClaimFiled: z.boolean(),

  // Prevention
  preventiveMeasures: z.array(z.string()).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SecurityIncident = z.infer<typeof SecurityIncidentSchema>;
