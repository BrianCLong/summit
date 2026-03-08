"use strict";
/**
 * @fileoverview Case Governance Domain Types
 *
 * Core domain model for Case Spaces management including:
 * - Case entities with sensitivity/jurisdiction classification
 * - Case membership with role-based access
 * - Case bindings to graph entities, evidence, tasks, and watchlists
 * - Authority/Warrant bindings for legal basis tracking
 *
 * Stack Detection Summary:
 * - TypeScript/Node.js backend
 * - Existing auth: AuthService with RBAC (ADMIN, ANALYST, VIEWER)
 * - Existing policy: PolicyEnforcer, PolicyService
 * - Existing audit: AuditAccessLogRepo with hash-chaining
 * - Existing cases: CaseRepo, CaseService (basic CRUD)
 * - This module mounted at: server/src/cases/domain
 *
 * @module cases/domain/CaseTypes
 */
Object.defineProperty(exports, "__esModule", { value: true });
