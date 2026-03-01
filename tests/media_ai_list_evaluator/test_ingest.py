import unittest
import os
import sys
import importlib.util

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

ingest_module = load_module('ingest_module', os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scripts/media_ai_list_evaluator/ingest.py')))

class TestMediaAIListEvaluatorIngest(unittest.TestCase):
    def test_unverified_source_fails(self):
        filepath = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/media_ai_list_evaluator/entrepreneur_2026_02_solo_founder.yaml'))
        with self.assertRaises(SystemExit) as cm:
            ingest_module.ingest(filepath)

        self.assertEqual(cm.exception.code, 1)

if __name__ == '__main__':
    unittest.main()
