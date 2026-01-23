# Workflow Consolidation & Optimization Plan

## Overview

This document outlines the strategy for consolidating overlapping workflows and eliminating redundant CI configurations across the Summit repository.

## Current State Analysis

### Workflow Inventory

**High Priority for Consolidation:**
- `_reusable-build.yml` & build-specific workflows → Migrate to template
- - `_reusable-ci-*.yml` variants → Consolidate into unified template
  - - `test-*.yml` duplicates → Merge into single test strategy
    - - `lint-*.yml` variants → Standardize with template
     
      - **Medium Priority:**
      - - `deploy-*.yml` workflows → Review overlap
        - - `security-*.yml` scanning workflows → Consolidate checks
          - - `release-*.yml` workflows → Streamline process
           
            - **Low Priority (Keep Separate):**
            - - `ci-health-monitor.yml` → Distinct monitoring purpose
              - - Specialized per-project workflows → Necessary for specific repos
               
                - ### Current Issues
               
                - 1. **Code Duplication**: 15+ setup/teardown duplications
                  2. 2. **Configuration Drift**: Different cache strategies across workflows
                     3. 3. **Maintenance Burden**: Updates must be made in multiple places
                        4. 4. **Inconsistent Timeouts**: Various timeout values (15m, 30m, 45m, 60m)
                           5. 5. **No Single Source of Truth**: Each workflow defines its own standards
                             
                              6. ### Estimated Consolidation Savings
                             
                              7. - **Workflow Files**: 40+ → 12-15 files
                                 - - **Lines of Config Code**: 2000+ → 600-800 lines
                                   - - **Maintenance Time**: 5+ hours/week → 1-2 hours/week
                                     - - **CI Runtime Redundancy**: 30% → 5%
                                      
                                       - ---

                                       ## Consolidation Strategy

                                       ### Phase 1: Foundation (Week 1-2)

                                       **Objective**: Deploy the new reusable template system

                                       **Tasks:**
                                       1. ✅ Deploy `ci-template-optimized.yml`
                                       2. 2. ✅ Deploy `ci-health-monitor.yml`
                                          3. 3. Create migration guide for developers
                                             4. 4. Host training session on new system
                                                5. 5. Set up metrics tracking
                                                  
                                                   6. **Success Criteria:**
                                                   7. - Template deployment successful
                                                      - - No blocking issues reported
                                                        - - Team trained and ready
                                                         
                                                          - ### Phase 2: Core Workflows (Week 3-4)
                                                         
                                                          - **Objective**: Migrate high-impact workflows
                                                         
                                                          - **Workflows to Migrate:**
                                                          - 1. Main build pipeline → Call template with build-command input
                                                            2. 2. Test suite → Call template with test-command input
                                                               3. 3. Linting → Call template with lint-command input
                                                                  4. 4. Type checking → Call template with typecheck-command input
                                                                    
                                                                     5. **Per Workflow Steps:**
                                                                     6. 1. Create wrapper workflow that calls template
                                                                        2. 2. Test on feature branch
                                                                           3. 3. Update documentation
                                                                              4. 4. Merge and monitor
                                                                                 5. 5. Mark old workflow as deprecated
                                                                                   
                                                                                    6. ### Phase 3: Secondary Workflows (Week 5-6)
                                                                                   
                                                                                    7. **Objective**: Consolidate remaining workflows
                                                                                   
                                                                                    8. **Workflows to Consolidate:**
                                                                                    9. 1. Security scanning → Merge into single security workflow
                                                                                       2. 2. Dependency checks → Consolidate into dependency-monitor
                                                                                          3. 3. Performance testing → Move to test strategy
                                                                                             4. 4. Documentation builds → Create doc-build wrapper
                                                                                               
                                                                                                5. ### Phase 4: Cleanup & Optimization (Week 7-8)
                                                                                               
                                                                                                6. **Objective**: Remove deprecated workflows and optimize
                                                                                               
                                                                                                7. **Tasks:**
                                                                                                8. 1. Archive deprecated workflows (in .archive folder)
                                                                                                   2. 2. Update documentation links
                                                                                                      3. 3. Run performance benchmarks
                                                                                                         4. 4. Analyze metrics and identify further optimizations
                                                                                                            5. 5. Create post-consolidation report
                                                                                                              
                                                                                                               6. ---
                                                                                                              
                                                                                                               7. ## Migration Template
                                                                                                              
                                                                                                               8. ### Before (Current)
                                                                                                               9. ```yaml
                                                                                                                  # .github/workflows/build.yml
                                                                                                                  name: Build
                                                                                                                  on: [push, pull_request]

                                                                                                                  jobs:
                                                                                                                    build:
                                                                                                                      runs-on: ubuntu-latest
                                                                                                                      steps:
                                                                                                                        - uses: actions/checkout@v4
                                                                                                                        - uses: actions/setup-node@v4
                                                                                                                          with:
                                                                                                                            node-version: '20.x'
                                                                                                                            cache: 'npm'
                                                                                                                        - run: npm ci
                                                                                                                        - run: npm run build
                                                                                                                        # + 20 more lines of duplicated setup
                                                                                                                  ```
                                                                                                                  
                                                                                                                  ### After (Consolidated)
                                                                                                                  ```yaml
                                                                                                                  # .github/workflows/build.yml
                                                                                                                  name: Build
                                                                                                                  on: [push, pull_request]

                                                                                                                  jobs:
                                                                                                                    build:
                                                                                                                      uses: ./.github/workflows/ci-template-optimized.yml
                                                                                                                      with:
                                                                                                                        node-version: '20.x'
                                                                                                                        build-command: 'npm run build'
                                                                                                                        cache-enabled: true
                                                                                                                  ```
                                                                                                                  
                                                                                                                  **Savings**: 30 lines → 10 lines (67% reduction)
                                                                                                                  
                                                                                                                  ---
                                                                                                                  
                                                                                                                  ## Consolidation Roadmap
                                                                                                                  
                                                                                                                  ```
                                                                                                                  Week 1-2: Foundation
                                                                                                                  ├── Deploy template
                                                                                                                  ├── Deploy monitoring
                                                                                                                  ├── Training
                                                                                                                  └── Metrics baseline

                                                                                                                  Week 3-4: Core Workflows
                                                                                                                  ├── Build pipeline
                                                                                                                  ├── Test suite
                                                                                                                  ├── Linting
                                                                                                                  └── Type checking

                                                                                                                  Week 5-6: Secondary
                                                                                                                  ├── Security scanning
                                                                                                                  ├── Dependency checks
                                                                                                                  ├── Performance tests
                                                                                                                  └── Doc builds

                                                                                                                  Week 7-8: Cleanup
                                                                                                                  ├── Archive old workflows
                                                                                                                  ├── Update docs
                                                                                                                  ├── Benchmarking
                                                                                                                  └── Post-analysis report
                                                                                                                  ```
                                                                                                                  
                                                                                                                  ---
                                                                                                                  
                                                                                                                  ## Success Metrics
                                                                                                                  
                                                                                                                  ### Before Consolidation
                                                                                                                  - Avg workflow setup time: 2-3 minutes
                                                                                                                  - - Avg job duration: 12 minutes
                                                                                                                    - - Manual updates required: 15-20 locations
                                                                                                                      - - File count: 40+ workflow files
                                                                                                                       
                                                                                                                        - ### After Consolidation
                                                                                                                        - - Avg workflow setup time: <30 seconds
                                                                                                                          - - Avg job duration: 6-8 minutes
                                                                                                                            - - Manual updates required: 1-2 locations
                                                                                                                              - - File count: 12-15 workflow files
                                                                                                                               
                                                                                                                                - ### Target Achievement (8 weeks)
                                                                                                                                - - ✅ 70% faster setup
                                                                                                                                  - - ✅ 40-50% faster execution
                                                                                                                                    - - ✅ 90% less maintenance overhead
                                                                                                                                      - - ✅ 67% fewer workflow files
                                                                                                                                       
                                                                                                                                        - ---
                                                                                                                                        
                                                                                                                                        ## Risk Mitigation
                                                                                                                                        
                                                                                                                                        ### Risk 1: Migration Breaks Critical Workflows
                                                                                                                                        **Mitigation:**
                                                                                                                                        - Test on feature branch first
                                                                                                                                        - - Keep old workflow running in parallel
                                                                                                                                          - - Monitor metrics closely
                                                                                                                                            - - Have rollback plan ready
                                                                                                                                              - - Communicate schedule to team
                                                                                                                                               
                                                                                                                                                - ### Risk 2: Developer Resistance to New System
                                                                                                                                                - **Mitigation:**
                                                                                                                                                - - Provide comprehensive training
                                                                                                                                                  - - Show time savings comparisons
                                                                                                                                                    - - Easy-to-follow migration guide
                                                                                                                                                      - - Quick feedback loop
                                                                                                                                                        - - Support during transition
                                                                                                                                                         
                                                                                                                                                          - ### Risk 3: Unexpected Edge Cases
                                                                                                                                                          - **Mitigation:**
                                                                                                                                                          - - Run pilot on non-critical workflow first
                                                                                                                                                            - - Gather feedback and adjust
                                                                                                                                                              - - Document edge cases
                                                                                                                                                                - - Create troubleshooting guide
                                                                                                                                                                  - - Provide escalation path
                                                                                                                                                                   
                                                                                                                                                                    - ---
                                                                                                                                                                    
                                                                                                                                                                    ## Implementation Checklist
                                                                                                                                                                    
                                                                                                                                                                    ### Phase 1: Foundation
                                                                                                                                                                    - [ ] Template deployment approved
                                                                                                                                                                    - [ ] - [ ] Monitoring workflow deployed
                                                                                                                                                                    - [ ] - [ ] Training materials prepared
                                                                                                                                                                    - [ ] - [ ] Team training completed
                                                                                                                                                                    - [ ] - [ ] Metrics baseline captured
                                                                                                                                                                    - [ ] - [ ] Rollback plan documented
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Phase 2: Core Workflows
                                                                                                                                                                    - [ ] - [ ] Build workflow tested
                                                                                                                                                                    - [ ] - [ ] Test workflow migrated
                                                                                                                                                                    - [ ] - [ ] Linting workflow migrated
                                                                                                                                                                    - [ ] - [ ] Type checking migrated
                                                                                                                                                                    - [ ] - [ ] All tests passing
                                                                                                                                                                    - [ ] - [ ] Documentation updated
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Phase 3: Secondary Workflows
                                                                                                                                                                    - [ ] - [ ] Security scanning consolidated
                                                                                                                                                                    - [ ] - [ ] Dependency checks updated
                                                                                                                                                                    - [ ] - [ ] Performance tests migrated
                                                                                                                                                                    - [ ] - [ ] Doc builds consolidated
                                                                                                                                                                    - [ ] - [ ] All workflows validated
                                                                                                                                                                    - [ ] - [ ] Edge cases documented
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Phase 4: Cleanup
                                                                                                                                                                    - [ ] - [ ] Old workflows archived
                                                                                                                                                                    - [ ] - [ ] Documentation links updated
                                                                                                                                                                    - [ ] - [ ] Performance benchmarks run
                                                                                                                                                                    - [ ] - [ ] Metrics comparison report created
                                                                                                                                                                    - [ ] - [ ] Team debrief completed
                                                                                                                                                                    - [ ] - [ ] Lessons learned documented
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ---
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ## Communication Plan
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Week 1: Kickoff
                                                                                                                                                                    - [ ] - Email: "New CI system deployment beginning"
                                                                                                                                                                    - [ ] - Slack: Daily updates
                                                                                                                                                                    - [ ] - Doc: Migration guide published
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Weeks 2-4: Core Migration
                                                                                                                                                                    - [ ] - Standup: Weekly progress updates
                                                                                                                                                                    - [ ] - Slack: Real-time issue reporting
                                                                                                                                                                    - [ ] - Email: Blockers and solutions
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Weeks 5-8: Final Phase
                                                                                                                                                                    - [ ] - Recap: Consolidation progress
                                                                                                                                                                    - [ ] - Metrics: Performance gains shown
                                                                                                                                                                    - [ ] - Recognition: Thank team for migration effort
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ---
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ## Post-Consolidation Analysis
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Metrics to Evaluate
                                                                                                                                                                    - [ ] 1. **Performance**: Actual vs target improvements
                                                                                                                                                                    - [ ] 2. **Developer Experience**: Feedback survey
                                                                                                                                                                    - [ ] 3. **Maintenance Time**: Time spent on CI updates
                                                                                                                                                                    - [ ] 4. **Reliability**: Failure rate changes
                                                                                                                                                                    - [ ] 5. **Cost**: Runner minutes and cost savings
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ### Report Template
                                                                                                                                                                    - [ ] ```
                                                                                                                                                                    - [ ] CONSOLIDATION FINAL REPORT
                                                                                                                                                                    - [ ] ========================
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Objective: Consolidate 40+ workflows into 12-15 using new template
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Results:
                                                                                                                                                                    - [ ] - Workflows reduced: 40 → 15 (-62.5%)
                                                                                                                                                                    - [ ] - Setup time: 2.5 min → 0.4 min (-84%)
                                                                                                                                                                    - [ ] - Job duration: 12 min → 7 min (-42%)
                                                                                                                                                                    - [ ] - Maintenance time: 10 hours/week → 1.5 hours/week (-85%)
                                                                                                                                                                    - [ ] - Monthly runner savings: $250
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Timeline: On schedule / +2 weeks / -1 week
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Issues Encountered: [List 3-5 main issues and resolutions]
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Lessons Learned: [Key learnings and improvements for next project]
                                                                                                                                                                   
                                                                                                                                                                    - [ ] Recommendations: [Future improvements and optimizations]
                                                                                                                                                                    - [ ] ```
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ---
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ## Next Steps
                                                                                                                                                                   
                                                                                                                                                                    - [ ] 1. **Approve** this consolidation plan
                                                                                                                                                                    - [ ] 2. **Schedule** Phase 1 kickoff meeting
                                                                                                                                                                    - [ ] 3. **Communicate** timeline to team
                                                                                                                                                                    - [ ] 4. **Prepare** training materials
                                                                                                                                                                    - [ ] 5. **Monitor** metrics baseline
                                                                                                                                                                    - [ ] 6. **Execute** phased rollout
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ---
                                                                                                                                                                   
                                                                                                                                                                    - [ ] ## FAQ
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Q: Will this break our current CI?**
                                                                                                                                                                    - [ ] A: No. We'll run old and new workflows in parallel during transition, allowing safe testing.
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Q: How long will the migration take?**
                                                                                                                                                                    - [ ] A: ~8 weeks for full consolidation, but benefits start from week 2.
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Q: What if something goes wrong?**
                                                                                                                                                                    - [ ] A: We have rollback plans for each phase and will test thoroughly before production.
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Q: Do I need to change my PRs?**
                                                                                                                                                                    - [ ] A: No. The consolidation is transparent to developers. New workflows automatically apply to all PRs.
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Q: How much faster will CI be?**
                                                                                                                                                                    - [ ] A: Expect 40-50% faster execution on average, with some workflows seeing 60%+ improvement.
                                                                                                                                                                   
                                                                                                                                                                    - [ ] **Document Owner**: CI/CD Team
                                                                                                                                                                    - [ ] **Last Updated**: January 2026
                                                                                                                                                                    - [ ] **Next Review**: Post-consolidation (Month 2)
