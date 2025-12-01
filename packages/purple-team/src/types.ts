/**
 * Exercise Types
 */
export enum ExerciseType {
  TABLETOP = 'tabletop',
  LIVE_FIRE = 'live-fire',
  HYBRID = 'hybrid',
  SIMULATION = 'simulation'
}

/**
 * Exercise Status
 */
export enum ExerciseStatus {
  PLANNED = 'planned',
  READY = 'ready',
  IN_PROGRESS = 'in-progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Purple Team Exercise
 */
export interface PurpleTeamExercise {
  id: string;
  name: string;
  description: string;
  type: ExerciseType;
  status: ExerciseStatus;
  objectives: ExerciseObjective[];
  scenario: ExerciseScenario;
  redTeam: TeamConfiguration;
  blueTeam: TeamConfiguration;
  schedule: ExerciseSchedule;
  scope: ExerciseScope;
  rules: RulesOfEngagement;
  playbook: AttackPlaybook;
  detections: Detection[];
  findings: ExerciseFinding[];
  metrics: ExerciseMetrics;
  afterAction: AfterActionReport | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseObjective {
  id: string;
  description: string;
  type: 'attack' | 'defense' | 'collaboration';
  success: boolean;
  notes?: string;
}

export interface ExerciseScenario {
  name: string;
  description: string;
  threatActor?: string;
  attackChain: string[];
  targetAssets: string[];
  initialAccess: string;
  objectives: string[];
}

export interface TeamConfiguration {
  lead: string;
  members: TeamMember[];
  tools: string[];
  communications: string;
}

export interface TeamMember {
  name: string;
  role: string;
  responsibilities: string[];
}

export interface ExerciseSchedule {
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  phases: SchedulePhase[];
}

export interface SchedulePhase {
  name: string;
  start: Date;
  end: Date;
  objectives: string[];
}

export interface ExerciseScope {
  inScope: string[];
  outOfScope: string[];
  networkRanges?: string[];
  systems?: string[];
  restrictions: string[];
}

export interface RulesOfEngagement {
  authorizedActions: string[];
  prohibitedActions: string[];
  escalationProcedures: string[];
  communicationProtocols: string[];
  safeWord?: string;
  emergencyContacts: string[];
}

/**
 * Attack Playbook
 */
export interface AttackPlaybook {
  id: string;
  name: string;
  description: string;
  techniques: PlaybookTechnique[];
  sequence: PlaybookSequence[];
  variants: PlaybookVariant[];
}

export interface PlaybookTechnique {
  id: string;
  mitreId: string;
  name: string;
  description: string;
  tools: string[];
  commands: string[];
  expectedDetections: string[];
  prerequisites: string[];
}

export interface PlaybookSequence {
  order: number;
  techniqueId: string;
  timing: 'immediate' | 'delayed' | 'conditional';
  condition?: string;
  delay?: number;
}

export interface PlaybookVariant {
  id: string;
  name: string;
  description: string;
  modifications: Record<string, unknown>;
}

/**
 * Detection
 */
export interface Detection {
  id: string;
  timestamp: Date;
  source: string;
  type: 'alert' | 'log' | 'manual';
  techniqueId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  truePositive: boolean;
  timeToDetect?: number;
  analyst?: string;
  notes?: string;
}

/**
 * Exercise Finding
 */
export interface ExerciseFinding {
  id: string;
  type: 'gap' | 'weakness' | 'strength' | 'recommendation';
  category: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedControls: string[];
  evidence: string[];
  remediation?: string;
  priority: number;
}

/**
 * Exercise Metrics
 */
export interface ExerciseMetrics {
  techniquesAttempted: number;
  techniquesSuccessful: number;
  techniquesDetected: number;
  detectionRate: number;
  meanTimeToDetect: number;
  meanTimeToRespond: number;
  falsePositives: number;
  falseNegatives: number;
  controlsCovered: number;
  controlsEffective: number;
  coverageScore: number;
  effectivenessScore: number;
}

/**
 * After Action Report
 */
export interface AfterActionReport {
  id: string;
  exerciseId: string;
  generatedAt: Date;
  executiveSummary: string;
  objectives: ObjectiveAssessment[];
  timeline: TimelineEvent[];
  findings: ExerciseFinding[];
  metrics: ExerciseMetrics;
  lessonsLearned: LessonLearned[];
  recommendations: Recommendation[];
  attachments: Attachment[];
}

export interface ObjectiveAssessment {
  objectiveId: string;
  description: string;
  achieved: boolean;
  notes: string;
}

export interface TimelineEvent {
  timestamp: Date;
  team: 'red' | 'blue' | 'both';
  action: string;
  result: string;
  techniqueId?: string;
}

export interface LessonLearned {
  id: string;
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  relatedFindings: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

/**
 * IOC (Indicator of Compromise)
 */
export interface IOC {
  id: string;
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file' | 'registry' | 'process';
  value: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  context: string;
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  relatedTechniques: string[];
}

/**
 * SIEM Rule
 */
export interface SIEMRule {
  id: string;
  name: string;
  description: string;
  platform: string;
  query: string;
  techniquesCovered: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTested?: Date;
  effectiveness?: number;
}

/**
 * Control Assessment
 */
export interface ControlAssessment {
  controlId: string;
  name: string;
  category: string;
  tested: boolean;
  effective: boolean;
  coverage: number;
  gaps: string[];
  recommendations: string[];
}
