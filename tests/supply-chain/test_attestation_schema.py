import sys
import os
import json
import unittest

# Add hack/supplychain to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../hack/supplychain')))
from verify_attestation_shape import verify_shape

class TestAttestationSchema(unittest.TestCase):
    def setUp(self):
        self.tmp_file = "test_attest.json"

    def tearDown(self):
        if os.path.exists(self.tmp_file):
            os.remove(self.tmp_file)

    def test_spdx_sbom(self):
        data = {"spdxVersion": "SPDX-2.3"}
        with open(self.tmp_file, 'w') as f:
            json.dump(data, f)
        self.assertEqual(verify_shape(self.tmp_file), 0)

    def test_slsa_provenance(self):
        data = {"builder": {"id": "test"}, "buildType": "https://mobyproject.org/buildkit@v1"}
        with open(self.tmp_file, 'w') as f:
            json.dump(data, f)
        self.assertEqual(verify_shape(self.tmp_file), 0)

    def test_intoto_statement(self):
        data = {"predicateType": "https://spdx.dev/Document", "subject": [], "predicate": {}}
        with open(self.tmp_file, 'w') as f:
            json.dump(data, f)
        self.assertEqual(verify_shape(self.tmp_file), 0)

    def test_invalid_json(self):
        with open(self.tmp_file, 'w') as f:
            f.write("invalid json")
        # verify_shape catches exception and returns 1
        self.assertEqual(verify_shape(self.tmp_file), 1)

if __name__ == '__main__':
    unittest.main()
