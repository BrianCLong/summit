import unittest
import uuid

from transformations.entity_mapper import (
    EntityMapper,
    EntityMappingRule,
    clean_phone_number,
    normalize_address,
    normalize_email,
    normalize_name,
)


class TestEntityMapper(unittest.TestCase):
    def test_normalize_name(self):
        self.assertEqual(normalize_name("John Doe"), "john doe")
        self.assertEqual(normalize_name("  Jane   Smith  "), "jane smith")
        self.assertEqual(normalize_name("Dr. Robert O'Neill!"), "robert oneill")
        self.assertIsNone(normalize_name(None))
        self.assertIsNone(normalize_name(""))

    def test_normalize_address(self):
        self.assertEqual(normalize_address("123 Main St, Apt. 4B"), "123 main st apt 4b")
        self.assertEqual(normalize_address("  500  Oak Ave.  "), "500 oak ave")
        self.assertEqual(normalize_address("P.O. Box 123"), "po box 123")
        self.assertIsNone(normalize_address(None))
        self.assertIsNone(normalize_address(""))

    def test_generate_entity_id_with_normalizations(self):
        mapper = EntityMapper([])  # Empty rules, we only test _generate_entity_id

        # Test PERSON_MAPPING like scenario
        person_rule = EntityMappingRule(
            entity_type="PERSON",
            id_fields=["email", "full_name"],
            label_field="full_name",
            property_mappings={},
            id_field_normalizations={"email": normalize_email, "full_name": normalize_name},
        )

        record1 = {"email": "John.Doe@Example.com", "full_name": "John Doe"}
        record2 = {"email": "john.doe@example.com ", "full_name": "john doe"}
        record3 = {"email": "JOHN.DOE@EXAMPLE.COM", "full_name": "Dr. John Doe"}

        id1 = mapper._generate_entity_id(
            record1,
            person_rule.id_fields,
            person_rule.entity_type,
            person_rule.id_field_normalizations,
        )
        id2 = mapper._generate_entity_id(
            record2,
            person_rule.id_fields,
            person_rule.entity_type,
            person_rule.id_field_normalizations,
        )
        id3 = mapper._generate_entity_id(
            record3,
            person_rule.id_fields,
            person_rule.entity_type,
            person_rule.id_field_normalizations,
        )

        self.assertEqual(id1, id2)
        self.assertEqual(id1, id3)
        self.assertTrue(id1.startswith("person_"))

        # Test ORGANIZATION_MAPPING like scenario
        org_rule = EntityMappingRule(
            entity_type="ORGANIZATION",
            id_fields=["company_name", "domain"],
            label_field="company_name",
            property_mappings={},
            id_field_normalizations={
                "company_name": normalize_name,
                "domain": lambda x: str(x).lower().strip(),
            },
        )

        org_record1 = {"company_name": "Acme Corp.", "domain": "ACME.COM"}
        org_record2 = {"company_name": "acme corp", "domain": "acme.com "}

        org_id1 = mapper._generate_entity_id(
            org_record1, org_rule.id_fields, org_rule.entity_type, org_rule.id_field_normalizations
        )
        org_id2 = mapper._generate_entity_id(
            org_record2, org_rule.id_fields, org_rule.entity_type, org_rule.id_field_normalizations
        )

        self.assertEqual(org_id1, org_id2)
        self.assertTrue(org_id1.startswith("organization_"))

        # Test fallback to UUID
        empty_record = {"email": None, "full_name": ""}
        uuid_id = mapper._generate_entity_id(
            empty_record,
            person_rule.id_fields,
            person_rule.entity_type,
            person_rule.id_field_normalizations,
        )
        self.assertIsNotNone(uuid.UUID(uuid_id, version=4))

    def test_transform_batch_deduplication(self):
        person_rule = EntityMappingRule(
            entity_type="PERSON",
            id_fields=["email", "full_name"],
            label_field="full_name",
            property_mappings={"email": "email", "phone": "phone", "age": "age"},
            transformations={"email": normalize_email, "phone": clean_phone_number},
            id_field_normalizations={"email": normalize_email, "full_name": normalize_name},
        )
        mapper = EntityMapper([person_rule])

        records = [
            {
                "email": "john.doe+alias@example.com",
                "full_name": "John Doe",
                "phone": "123-456-7890",
                "age": 30,
            },
            {
                "email": "john.doe@example.com",
                "full_name": "john doe ",
                "age": 31,
            },  # Near duplicate
            {"email": "another@example.com", "full_name": "Jane Smith", "phone": "098-765-4321"},
        ]

        entities = mapper.transform_batch(records)

        self.assertEqual(len(entities), 2)  # Expecting 2 unique entities after deduplication

        # Verify merged properties for John Doe
        john_doe_entity = next(e for e in entities if e["label"] == "john doe")
        self.assertIsNotNone(john_doe_entity)
        self.assertEqual(john_doe_entity["props"]["email"], "johndoe@example.com")
        self.assertEqual(john_doe_entity["props"]["phone"], "1234567890")
        self.assertEqual(
            john_doe_entity["props"]["age"], 31
        )  # Age should be updated from the second record

        # Verify Jane Smith entity
        jane_smith_entity = next(e for e in entities if e["label"] == "jane smith")
        self.assertIsNotNone(jane_smith_entity)
        self.assertEqual(jane_smith_entity["props"]["email"], "another@example.com")


if __name__ == "__main__":
    unittest.main()
