/**
 * Training and Certification Platform
 * Online training with courses, modules, labs, exams, and certifications
 */

import { Pool } from 'pg';
import { Logger } from 'pino';

export interface TrainingCourse {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  learningPath?: string;
  difficulty?: string;
  estimatedHours?: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  isCertificationRequired: boolean;
  passingScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  resources?: any;
  createdAt: Date;
}

export interface UserTrainingProgress {
  id: string;
  userId: string;
  courseId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'FAILED';
  progressPercentage: number;
  currentModuleId?: string;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
}

export interface CertificationExam {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMinutes?: number;
  maxAttempts: number;
  questions: any;
  isActive: boolean;
  createdAt: Date;
}

export interface Certification {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  badgeUrl?: string;
  certificateUrl?: string;
}

export class TrainingService {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger.child({ service: 'TrainingService' });
  }

  async createCourse(
    tenantId: string,
    title: string,
    description: string,
    difficulty?: string,
    estimatedHours?: number
  ): Promise<TrainingCourse> {
    const result = await this.pool.query(
      `INSERT INTO training_courses (tenant_id, title, description, difficulty, estimated_hours)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, title, description, difficulty, estimatedHours]
    );

    this.logger.info({ courseId: result.rows[0].id, title }, 'Training course created');
    return this.mapRowToCourse(result.rows[0]);
  }

  async enrollUser(userId: string, courseId: string): Promise<UserTrainingProgress> {
    const result = await this.pool.query(
      `INSERT INTO user_training_progress (user_id, course_id, status, started_at, last_accessed_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, course_id) DO UPDATE
       SET last_accessed_at = NOW()
       RETURNING *`,
      [userId, courseId, 'IN_PROGRESS']
    );

    this.logger.info({ userId, courseId }, 'User enrolled in course');
    return this.mapRowToProgress(result.rows[0]);
  }

  async updateProgress(userId: string, courseId: string, progressPercentage: number): Promise<void> {
    await this.pool.query(
      `UPDATE user_training_progress
       SET progress_percentage = $3, last_accessed_at = NOW(),
           status = CASE WHEN $3 >= 100 THEN 'COMPLETED'::training_status ELSE status END,
           completed_at = CASE WHEN $3 >= 100 THEN NOW() ELSE completed_at END
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId, progressPercentage]
    );
  }

  async issueCertification(userId: string, courseId: string, expiresInMonths?: number): Promise<Certification> {
    const certificateNumber = await this.generateCertificateNumber();
    const expiresAt = expiresInMonths
      ? new Date(Date.now() + expiresInMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const result = await this.pool.query(
      `INSERT INTO certifications (user_id, course_id, certificate_number, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, courseId, certificateNumber, expiresAt]
    );

    this.logger.info({ userId, courseId, certificateNumber }, 'Certification issued');
    return this.mapRowToCertification(result.rows[0]);
  }

  async getCourses(tenantId: string): Promise<TrainingCourse[]> {
    const result = await this.pool.query(
      'SELECT * FROM training_courses WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows.map(row => this.mapRowToCourse(row));
  }

  async getUserProgress(userId: string): Promise<UserTrainingProgress[]> {
    const result = await this.pool.query(
      'SELECT * FROM user_training_progress WHERE user_id = $1 ORDER BY last_accessed_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRowToProgress(row));
  }

  async getUserCertifications(userId: string): Promise<Certification[]> {
    const result = await this.pool.query(
      'SELECT * FROM certifications WHERE user_id = $1 ORDER BY issued_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRowToCertification(row));
  }

  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${year}-${random}`;
  }

  private mapRowToCourse(row: any): TrainingCourse {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      learningPath: row.learning_path,
      difficulty: row.difficulty,
      estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : undefined,
      prerequisites: row.prerequisites,
      learningObjectives: row.learning_objectives,
      isCertificationRequired: row.is_certification_required,
      passingScore: row.passing_score,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToProgress(row: any): UserTrainingProgress {
    return {
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      status: row.status,
      progressPercentage: parseFloat(row.progress_percentage) || 0,
      currentModuleId: row.current_module_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastAccessedAt: row.last_accessed_at
    };
  }

  private mapRowToCertification(row: any): Certification {
    return {
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      certificateNumber: row.certificate_number,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      badgeUrl: row.badge_url,
      certificateUrl: row.certificate_url
    };
  }
}

export * from './index';
