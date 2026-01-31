import os
import sys
import unittest

from airflow.models import DagBag

# Ensure the airflow directory is in the path for imports
sys.path.append(os.path.join(os.getcwd(), 'airflow'))

class TestSummitLineageDAG(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # We point to the dags folder
        cls.dagbag = DagBag(dag_folder='airflow/dags', include_examples=False)

    def test_dag_loaded(self):
        """Verify that the summit_lineage_pipeline_v1 DAG is correctly loaded."""
        dag_id = 'summit_lineage_pipeline_v1'
        dag = self.dagbag.get_dag(dag_id)
        self.assertIsNotNone(dag, f"Failed to load DAG {dag_id}")
        self.assertEqual(len(dag.tasks), 1, "DAG should have exactly 1 task")

    def test_dbt_task_config(self):
        """Verify the configuration of the dbt_analytics_models task."""
        dag = self.dagbag.get_dag('summit_lineage_pipeline_v1')
        dbt_task = dag.get_task('dbt_analytics_models')

        # Check command
        self.assertIn("dbt-ol run", dbt_task.bash_command)

        # Check environment variables for ParentRunFacet handoff
        self.assertIn('OPENLINEAGE_PARENT_RUN_ID', dbt_task.env)
        self.assertIn('OPENLINEAGE_PARENT_JOB_NAMESPACE', dbt_task.env)
        self.assertIn('OPENLINEAGE_PARENT_JOB_NAME', dbt_task.env)

        self.assertEqual(dbt_task.env['OPENLINEAGE_PARENT_JOB_NAMESPACE'], 'summit/airflow')
        self.assertTrue(dbt_task.env['OPENLINEAGE_PARENT_JOB_NAME'].endswith('.dbt_analytics_models'))

    def test_provenance_script_logic(self):
        """Basic sanity check for the PROV export logic."""
        from scripts.provenance.export_prov import ol_to_prov

        test_event = {
            "eventType": "START",
            "run": {"runId": "test-uuid"},
            "job": {"namespace": "ns", "name": "job"},
            "inputs": [{"namespace": "in-ns", "name": "in-name"}]
        }
        prov = ol_to_prov(test_event)
        self.assertEqual(prov['@context']['prov'], "http://www.w3.org/ns/prov#")

        # Find the activity in the graph
        activity = next(item for item in prov['@graph'] if item['@type'] == 'prov:Activity')
        self.assertEqual(activity['@id'], "summit:run:test-uuid")
        self.assertEqual(len(activity['prov:used']), 1)

if __name__ == '__main__':
    unittest.main()
