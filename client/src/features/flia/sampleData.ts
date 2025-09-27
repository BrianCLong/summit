import type { FliaReport } from './types'

export const sampleReport: FliaReport = {
  change_id: 'feature:user_profile.email_domain',
  impacted_nodes: [
    {
      id: 'feature:session.engagement_7d',
      type: 'feature',
      name: 'session.engagement_7d',
      owners: ['retention-ml']
    },
    {
      id: 'model:churn_predictor',
      type: 'model',
      name: 'churn_predictor',
      owners: ['retention-ml']
    },
    {
      id: 'model:customer_lifetime_value',
      type: 'model',
      name: 'customer_lifetime_value',
      owners: ['finance-ml']
    },
    {
      id: 'model:marketing_segmentation',
      type: 'model',
      name: 'marketing_segmentation',
      owners: ['growth-ml']
    },
    {
      id: 'pipeline:session_engagement',
      type: 'pipeline',
      name: 'session_engagement',
      owners: ['retention-ml']
    }
  ],
  impacted_models: [
    {
      id: 'model:churn_predictor',
      type: 'model',
      name: 'churn_predictor',
      owners: ['retention-ml']
    },
    {
      id: 'model:customer_lifetime_value',
      type: 'model',
      name: 'customer_lifetime_value',
      owners: ['finance-ml']
    },
    {
      id: 'model:marketing_segmentation',
      type: 'model',
      name: 'marketing_segmentation',
      owners: ['growth-ml']
    }
  ],
  metrics_at_risk: ['clv_mae', 'coverage_rate', 'f1', 'roc_auc', 'segment_purity'],
  retrain_order: [
    'model:marketing_segmentation',
    'model:churn_predictor',
    'model:customer_lifetime_value'
  ],
  playbook: {
    tests: [
      {
        id: 'tests::feature_session_engagement_contract',
        description: 'dbt contract tests for session.engagement_7d',
        handler: 'run_dbt',
        args: ['session_engagement_7d']
      },
      {
        id: 'tests::feature_user_profile_email_domain_contract',
        description: 'Feature contract coverage for user_profile.email_domain',
        handler: 'run_pytest',
        args: ['tests/features/test_user_profile_email_domain.py']
      },
      {
        id: 'tests::model_churn_predictor',
        description: 'Regression tests for churn model',
        handler: 'run_pytest',
        args: ['tests/models/test_churn_predictor.py']
      },
      {
        id: 'tests::model_customer_lifetime_value',
        description: 'Sanity checks for CLV model',
        handler: 'run_pytest',
        args: ['tests/models/test_customer_lifetime_value.py']
      },
      {
        id: 'tests::model_marketing_segmentation',
        description: 'MLflow validation for marketing segmentation',
        handler: 'run_pytest',
        args: ['tests/models/test_marketing_segmentation.py']
      },
      {
        id: 'tests::pipeline_session_engagement',
        description: 'Data quality checks for engagement DAG',
        handler: 'run_dbt',
        args: ['session_engagement']
      }
    ],
    backfills: [
      {
        id: 'backfill::model_churn_predictor',
        description: 'Recompute churn training snapshots',
        handler: 'backfill_pipeline',
        args: ['model_churn_predictor']
      },
      {
        id: 'backfill::model_customer_lifetime_value',
        description: 'Refresh CLV inference tables',
        handler: 'backfill_pipeline',
        args: ['model_customer_lifetime_value']
      },
      {
        id: 'backfill::model_marketing_segmentation',
        description: 'Refresh marketing segment assignments',
        handler: 'backfill_pipeline',
        args: ['model_marketing_segmentation']
      },
      {
        id: 'backfill::pipeline_session_engagement',
        description: 'Backfill engagement window for trailing week',
        handler: 'backfill_pipeline',
        args: ['pipeline_session_engagement']
      },
      {
        id: 'backfill::session_engagement_7d',
        description: 'Rebuild session.engagement_7d feature window',
        handler: 'backfill_pipeline',
        args: ['session_engagement_7d']
      },
      {
        id: 'backfill::user_profile_email_domain',
        description: 'Backfill warehouse column user_profile.email_domain',
        handler: 'backfill_pipeline',
        args: ['user_profile_email_domain']
      }
    ],
    cache_invalidations: [
      {
        id: 'cache::churn_scores',
        description: 'Drop cached churn scores',
        handler: 'invalidate_cache',
        args: ['churn:scores']
      },
      {
        id: 'cache::personalization_user_profile_email_domain',
        description: 'Invalidate personalization cache entries for email domain feature',
        handler: 'invalidate_cache',
        args: ['personalization:user_profile.email_domain']
      },
      {
        id: 'cache::segment_store',
        description: 'Purge marketing segment store',
        handler: 'invalidate_cache',
        args: ['segments:store']
      },
      {
        id: 'cache::session_engagement_predictions',
        description: 'Clear engagement prediction cache',
        handler: 'invalidate_cache',
        args: ['engagement:predictions']
      }
    ]
  },
  playbook_results: {
    tests: [
      {
        id: 'tests::feature_session_engagement_contract',
        description: 'dbt contract tests for session.engagement_7d',
        handler: 'run_dbt',
        args: ['session_engagement_7d'],
        result: {
          status: 'passed',
          runner: 'dbt',
          model: 'session_engagement_7d',
          rows: 1280
        }
      },
      {
        id: 'tests::feature_user_profile_email_domain_contract',
        description: 'Feature contract coverage for user_profile.email_domain',
        handler: 'run_pytest',
        args: ['tests/features/test_user_profile_email_domain.py'],
        result: {
          status: 'passed',
          runner: 'pytest',
          target: 'tests/features/test_user_profile_email_domain.py',
          summary: 'Pytest suite executed for tests/features/test_user_profile_email_domain.py'
        }
      },
      {
        id: 'tests::model_churn_predictor',
        description: 'Regression tests for churn model',
        handler: 'run_pytest',
        args: ['tests/models/test_churn_predictor.py'],
        result: {
          status: 'passed',
          runner: 'pytest',
          target: 'tests/models/test_churn_predictor.py',
          summary: 'Pytest suite executed for tests/models/test_churn_predictor.py'
        }
      },
      {
        id: 'tests::model_customer_lifetime_value',
        description: 'Sanity checks for CLV model',
        handler: 'run_pytest',
        args: ['tests/models/test_customer_lifetime_value.py'],
        result: {
          status: 'passed',
          runner: 'pytest',
          target: 'tests/models/test_customer_lifetime_value.py',
          summary: 'Pytest suite executed for tests/models/test_customer_lifetime_value.py'
        }
      },
      {
        id: 'tests::model_marketing_segmentation',
        description: 'MLflow validation for marketing segmentation',
        handler: 'run_pytest',
        args: ['tests/models/test_marketing_segmentation.py'],
        result: {
          status: 'passed',
          runner: 'pytest',
          target: 'tests/models/test_marketing_segmentation.py',
          summary: 'Pytest suite executed for tests/models/test_marketing_segmentation.py'
        }
      },
      {
        id: 'tests::pipeline_session_engagement',
        description: 'Data quality checks for engagement DAG',
        handler: 'run_dbt',
        args: ['session_engagement'],
        result: {
          status: 'passed',
          runner: 'dbt',
          model: 'session_engagement',
          rows: 1280
        }
      }
    ],
    backfills: [
      {
        id: 'backfill::model_churn_predictor',
        description: 'Recompute churn training snapshots',
        handler: 'backfill_pipeline',
        args: ['model_churn_predictor'],
        result: {
          status: 'completed',
          pipeline: 'model_churn_predictor',
          rows_processed: 5421
        }
      },
      {
        id: 'backfill::model_customer_lifetime_value',
        description: 'Refresh CLV inference tables',
        handler: 'backfill_pipeline',
        args: ['model_customer_lifetime_value'],
        result: {
          status: 'completed',
          pipeline: 'model_customer_lifetime_value',
          rows_processed: 5421
        }
      },
      {
        id: 'backfill::model_marketing_segmentation',
        description: 'Refresh marketing segment assignments',
        handler: 'backfill_pipeline',
        args: ['model_marketing_segmentation'],
        result: {
          status: 'completed',
          pipeline: 'model_marketing_segmentation',
          rows_processed: 5421
        }
      },
      {
        id: 'backfill::pipeline_session_engagement',
        description: 'Backfill engagement window for trailing week',
        handler: 'backfill_pipeline',
        args: ['pipeline_session_engagement'],
        result: {
          status: 'completed',
          pipeline: 'pipeline_session_engagement',
          rows_processed: 5421
        }
      },
      {
        id: 'backfill::session_engagement_7d',
        description: 'Rebuild session.engagement_7d feature window',
        handler: 'backfill_pipeline',
        args: ['session_engagement_7d'],
        result: {
          status: 'completed',
          pipeline: 'session_engagement_7d',
          rows_processed: 5421
        }
      },
      {
        id: 'backfill::user_profile_email_domain',
        description: 'Backfill warehouse column user_profile.email_domain',
        handler: 'backfill_pipeline',
        args: ['user_profile_email_domain'],
        result: {
          status: 'completed',
          pipeline: 'user_profile_email_domain',
          rows_processed: 5421
        }
      }
    ],
    cache_invalidations: [
      {
        id: 'cache::churn_scores',
        description: 'Drop cached churn scores',
        handler: 'invalidate_cache',
        args: ['churn:scores'],
        result: {
          status: 'invalidated',
          cache_key: 'churn:scores'
        }
      },
      {
        id: 'cache::personalization_user_profile_email_domain',
        description: 'Invalidate personalization cache entries for email domain feature',
        handler: 'invalidate_cache',
        args: ['personalization:user_profile.email_domain'],
        result: {
          status: 'invalidated',
          cache_key: 'personalization:user_profile.email_domain'
        }
      },
      {
        id: 'cache::segment_store',
        description: 'Purge marketing segment store',
        handler: 'invalidate_cache',
        args: ['segments:store'],
        result: {
          status: 'invalidated',
          cache_key: 'segments:store'
        }
      },
      {
        id: 'cache::session_engagement_predictions',
        description: 'Clear engagement prediction cache',
        handler: 'invalidate_cache',
        args: ['engagement:predictions'],
        result: {
          status: 'invalidated',
          cache_key: 'engagement:predictions'
        }
      }
    ]
  }
}
