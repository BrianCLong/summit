from summit.enterprise.licensing import LicenseManager, UsageMeter, LicenseKey
import json
import time
import hashlib

def test_license_verification():
    # Generate a valid license mock
    valid_until = time.time() + 3600
    lic_data = {
        "id": "lic_123",
        "tier": "GALACTIC",
        "features": ["hyper_compute", "akashic_record"],
        "valid_until": valid_until,
        "signature": hashlib.sha256(f"lic_123:GALACTIC".encode()).hexdigest()
    }
    lic_str = json.dumps(lic_data)

    lm = LicenseManager("pub_key")
    assert lm.load_license(lic_str)
    assert lm.check_feature("hyper_compute")
    assert not lm.check_feature("missing_feature")

def test_usage_billing():
    meter = UsageMeter()
    meter.track("hyper_rows", 1000) # $10.00
    meter.track("agent_cycles", 5)  # $5.00

    invoice = meter.generate_invoice()
    assert invoice["total_usd"] == 15.00
    assert invoice["breakdown"]["hyper_rows"] == 10.00
