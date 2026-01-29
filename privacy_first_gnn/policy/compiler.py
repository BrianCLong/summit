class PrivacyPolicyCompiler:
    def __init__(self, field_classifications):
        self.field_classifications = field_classifications

    def compile(self):
        """
        Compile field classifications into enforcement rules.
        """
        rules = {
            "must_encrypt": [],
            "must_mask": [],
            "allow_plaintext": []
        }

        for field, classification in self.field_classifications.items():
            if classification == "SENSITIVE":
                rules["must_encrypt"].append(field)
            elif classification == "PII":
                rules["must_mask"].append(field)
            else:
                rules["allow_plaintext"].append(field)

        return rules

def apply_policy(data, compiled_rules):
    """
    Apply compiled rules to data, ensuring compliance.
    """
    if isinstance(data, dict):
        new_data = {}
        for k, v in data.items():
            if k in compiled_rules["must_encrypt"]:
                # In a real system, this would trigger encryption or verify it's encrypted
                new_data[k] = f"ENFORCED_ENCRYPTION({v})"
            elif k in compiled_rules["must_mask"]:
                new_data[k] = "****"
            else:
                new_data[k] = apply_policy(v, compiled_rules)
        return new_data
    return data
