import {
  PurpleTeamExercise,
  ExerciseType,
  ExerciseStatus,
  ExerciseObjective,
  ExerciseScenario,
  AttackPlaybook,
  Detection,
  ExerciseFinding,
  ExerciseMetrics,
  AfterActionReport,
  TimelineEvent,
  LessonLearned,
  Recommendation
} from '../types';

/**
 * Purple Team Exercise Manager
 */
export class ExerciseManager {
  private exercises: Map<string, PurpleTeamExercise> = new Map();
  private activeExercise: PurpleTeamExercise | null = null;

  /**
   * Create new exercise
   */
  createExercise(
    name: string,
    type: ExerciseType,
    scenario: ExerciseScenario,
    objectives: string[]
  ): PurpleTeamExercise {
    const exercise: PurpleTeamExercise = {
      id: this.generateId(),
      name,
      description: scenario.description,
      type,
      status: ExerciseStatus.PLANNED,
      objectives: objectives.map((desc, idx) => ({
        id: `obj_${idx + 1}`,
        description: desc,
        type: 'collaboration' as const,
        success: false
      })),
      scenario,
      redTeam: {
        lead: '',
        members: [],
        tools: [],
        communications: ''
      },
      blueTeam: {
        lead: '',
        members: [],
        tools: [],
        communications: ''
      },
      schedule: {
        plannedStart: new Date(),
        plannedEnd: new Date(),
        phases: []
      },
      scope: {
        inScope: [],
        outOfScope: [],
        restrictions: []
      },
      rules: {
        authorizedActions: [],
        prohibitedActions: [],
        escalationProcedures: [],
        communicationProtocols: [],
        emergencyContacts: []
      },
      playbook: {
        id: this.generateId(),
        name: `${name} Playbook`,
        description: '',
        techniques: [],
        sequence: [],
        variants: []
      },
      detections: [],
      findings: [],
      metrics: this.initializeMetrics(),
      afterAction: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  /**
   * Start exercise
   */
  startExercise(exerciseId: string): PurpleTeamExercise {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    exercise.status = ExerciseStatus.IN_PROGRESS;
    exercise.schedule.actualStart = new Date();
    exercise.updatedAt = new Date();

    this.activeExercise = exercise;
    return exercise;
  }

  /**
   * Record detection
   */
  recordDetection(
    exerciseId: string,
    detection: Omit<Detection, 'id' | 'timestamp'>
  ): Detection {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    const newDetection: Detection = {
      id: this.generateId(),
      timestamp: new Date(),
      ...detection
    };

    exercise.detections.push(newDetection);
    exercise.updatedAt = new Date();

    // Update metrics
    this.updateMetrics(exercise);

    return newDetection;
  }

  /**
   * Record finding
   */
  recordFinding(
    exerciseId: string,
    finding: Omit<ExerciseFinding, 'id'>
  ): ExerciseFinding {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    const newFinding: ExerciseFinding = {
      id: this.generateId(),
      ...finding
    };

    exercise.findings.push(newFinding);
    exercise.updatedAt = new Date();

    return newFinding;
  }

  /**
   * Complete exercise
   */
  completeExercise(exerciseId: string): PurpleTeamExercise {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    exercise.status = ExerciseStatus.COMPLETED;
    exercise.schedule.actualEnd = new Date();
    exercise.updatedAt = new Date();

    // Final metrics calculation
    this.updateMetrics(exercise);

    if (this.activeExercise?.id === exerciseId) {
      this.activeExercise = null;
    }

    return exercise;
  }

  /**
   * Generate after action report
   */
  generateAfterActionReport(exerciseId: string): AfterActionReport {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    // Generate timeline from detections and actions
    const timeline = this.generateTimeline(exercise);

    // Analyze findings and generate lessons learned
    const lessonsLearned = this.analyzeLessonsLearned(exercise);

    // Generate recommendations
    const recommendations = this.generateRecommendations(exercise);

    // Create executive summary
    const executiveSummary = this.generateExecutiveSummary(exercise);

    const report: AfterActionReport = {
      id: this.generateId(),
      exerciseId,
      generatedAt: new Date(),
      executiveSummary,
      objectives: exercise.objectives.map(obj => ({
        objectiveId: obj.id,
        description: obj.description,
        achieved: obj.success,
        notes: obj.notes || ''
      })),
      timeline,
      findings: exercise.findings,
      metrics: exercise.metrics,
      lessonsLearned,
      recommendations,
      attachments: []
    };

    exercise.afterAction = report;
    exercise.updatedAt = new Date();

    return report;
  }

  /**
   * Get exercise by ID
   */
  getExercise(id: string): PurpleTeamExercise | undefined {
    return this.exercises.get(id);
  }

  /**
   * List all exercises
   */
  listExercises(status?: ExerciseStatus): PurpleTeamExercise[] {
    let exercises = Array.from(this.exercises.values());

    if (status) {
      exercises = exercises.filter(e => e.status === status);
    }

    return exercises.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private initializeMetrics(): ExerciseMetrics {
    return {
      techniquesAttempted: 0,
      techniquesSuccessful: 0,
      techniquesDetected: 0,
      detectionRate: 0,
      meanTimeToDetect: 0,
      meanTimeToRespond: 0,
      falsePositives: 0,
      falseNegatives: 0,
      controlsCovered: 0,
      controlsEffective: 0,
      coverageScore: 0,
      effectivenessScore: 0
    };
  }

  private updateMetrics(exercise: PurpleTeamExercise): void {
    const detections = exercise.detections;
    const truePositives = detections.filter(d => d.truePositive);
    const falsePositives = detections.filter(d => !d.truePositive);

    exercise.metrics.techniquesDetected = new Set(
      truePositives.map(d => d.techniqueId).filter(Boolean)
    ).size;

    exercise.metrics.falsePositives = falsePositives.length;

    if (exercise.metrics.techniquesAttempted > 0) {
      exercise.metrics.detectionRate =
        exercise.metrics.techniquesDetected / exercise.metrics.techniquesAttempted;
    }

    // Calculate mean time to detect
    const detectTimes = truePositives
      .filter(d => d.timeToDetect !== undefined)
      .map(d => d.timeToDetect!);

    if (detectTimes.length > 0) {
      exercise.metrics.meanTimeToDetect =
        detectTimes.reduce((a, b) => a + b, 0) / detectTimes.length;
    }

    // Calculate effectiveness score
    exercise.metrics.effectivenessScore =
      exercise.metrics.detectionRate * 100 -
      (exercise.metrics.falsePositives * 5);
  }

  private generateTimeline(exercise: PurpleTeamExercise): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const detection of exercise.detections) {
      events.push({
        timestamp: detection.timestamp,
        team: 'blue',
        action: `Detection: ${detection.description}`,
        result: detection.truePositive ? 'True Positive' : 'False Positive',
        techniqueId: detection.techniqueId
      });
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private analyzeLessonsLearned(exercise: PurpleTeamExercise): LessonLearned[] {
    const lessons: LessonLearned[] = [];

    // Analyze detection gaps
    if (exercise.metrics.detectionRate < 0.5) {
      lessons.push({
        id: this.generateId(),
        category: 'Detection',
        description: 'Low detection rate indicates significant visibility gaps',
        impact: 'high',
        actionItems: [
          'Review and enhance detection rules',
          'Increase log collection coverage',
          'Implement additional monitoring tools'
        ]
      });
    }

    // Analyze false positives
    if (exercise.metrics.falsePositives > 5) {
      lessons.push({
        id: this.generateId(),
        category: 'Alert Quality',
        description: 'High false positive rate may cause alert fatigue',
        impact: 'medium',
        actionItems: [
          'Tune detection rules to reduce false positives',
          'Implement alert correlation',
          'Review alert thresholds'
        ]
      });
    }

    // Analyze response time
    if (exercise.metrics.meanTimeToDetect > 60) {
      lessons.push({
        id: this.generateId(),
        category: 'Response Time',
        description: 'Mean time to detect exceeds acceptable threshold',
        impact: 'high',
        actionItems: [
          'Implement real-time alerting',
          'Enhance automation in detection pipeline',
          'Review analyst workflows'
        ]
      });
    }

    return lessons;
  }

  private generateRecommendations(exercise: PurpleTeamExercise): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Generate recommendations from findings
    const criticalFindings = exercise.findings.filter(f => f.severity === 'critical');
    const highFindings = exercise.findings.filter(f => f.severity === 'high');

    for (const finding of criticalFindings) {
      recommendations.push({
        id: this.generateId(),
        priority: 'critical',
        category: finding.category,
        title: `Address: ${finding.title}`,
        description: finding.remediation || 'Immediate remediation required',
        effort: 'high',
        expectedOutcome: 'Eliminate critical security gap',
        relatedFindings: [finding.id]
      });
    }

    for (const finding of highFindings) {
      recommendations.push({
        id: this.generateId(),
        priority: 'high',
        category: finding.category,
        title: `Address: ${finding.title}`,
        description: finding.remediation || 'Remediation recommended',
        effort: 'medium',
        expectedOutcome: 'Improve security posture',
        relatedFindings: [finding.id]
      });
    }

    // General recommendations based on metrics
    if (exercise.metrics.coverageScore < 50) {
      recommendations.push({
        id: this.generateId(),
        priority: 'high',
        category: 'Coverage',
        title: 'Improve Control Coverage',
        description: 'Expand security control coverage across critical assets',
        effort: 'high',
        expectedOutcome: 'Increased visibility and protection',
        relatedFindings: []
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateExecutiveSummary(exercise: PurpleTeamExercise): string {
    const objectives = exercise.objectives;
    const achieved = objectives.filter(o => o.success).length;
    const metrics = exercise.metrics;

    return `
Purple Team Exercise "${exercise.name}" has been completed.

Key Results:
- ${achieved} of ${objectives.length} objectives achieved (${Math.round((achieved / objectives.length) * 100)}%)
- Detection rate: ${Math.round(metrics.detectionRate * 100)}%
- Mean time to detect: ${Math.round(metrics.meanTimeToDetect)} minutes
- ${exercise.findings.filter(f => f.severity === 'critical').length} critical findings identified
- ${exercise.findings.filter(f => f.severity === 'high').length} high severity findings identified

Overall effectiveness score: ${Math.round(metrics.effectivenessScore)}%
    `.trim();
  }

  private generateId(): string {
    return `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
