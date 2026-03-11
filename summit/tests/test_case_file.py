import pytest
from summit.counterintelligence.case_file import CounterintelligenceCaseFile, TurningLedger, AssetStatus, LedgerEntry

def test_ledger_initialization():
    ledger = TurningLedger()
    assert ledger.current_state == AssetStatus.UNKNOWN
    assert len(ledger.entries) == 0

def test_legal_state_transitions():
    ledger = TurningLedger()

    # UNKNOWN -> IDENTIFIED
    ledger.append(AssetStatus.IDENTIFIED, actor="system", rationale="Initial detection", context_id="graph-123")
    assert ledger.current_state == AssetStatus.IDENTIFIED

    # IDENTIFIED -> SUSPECTED_ADVERSARIAL
    ledger.append(AssetStatus.SUSPECTED_ADVERSARIAL, actor="analyst", rationale="Patterns match known campaign")
    assert ledger.current_state == AssetStatus.SUSPECTED_ADVERSARIAL

    # SUSPECTED_ADVERSARIAL -> MONITORED_SENSOR
    ledger.append(AssetStatus.MONITORED_SENSOR, actor="system", rationale="Passive collection engaged")
    assert ledger.current_state == AssetStatus.MONITORED_SENSOR

    # MONITORED_SENSOR -> TURNED_EARLY_WARNING
    ledger.append(AssetStatus.TURNED_EARLY_WARNING, actor="analyst", rationale="High intelligence value confirmed")
    assert ledger.current_state == AssetStatus.TURNED_EARLY_WARNING

    # TURNED_EARLY_WARNING -> BURNED
    ledger.append(AssetStatus.BURNED, actor="system", rationale="Asset behavior became erratic")
    assert ledger.current_state == AssetStatus.BURNED

def test_illegal_state_transition():
    ledger = TurningLedger()

    # Cannot jump from UNKNOWN directly to TURNED_EARLY_WARNING
    with pytest.raises(ValueError):
        ledger.append(AssetStatus.TURNED_EARLY_WARNING, actor="system", rationale="Invalid jump")

def test_append_only_ledger():
    ledger = TurningLedger()
    ledger.append(AssetStatus.IDENTIFIED, actor="system", rationale="Initial detection")

    # Verify that the returned entries list is a copy, preventing direct modification
    entries_copy = ledger.entries
    entries_copy.pop()

    assert len(ledger.entries) == 1

def test_case_file_initialization():
    cf = CounterintelligenceCaseFile(case_id="CF-001", asset_ids=["asset-a", "asset-b"])

    assert cf.case_id == "CF-001"
    assert "DEFENSIVE ANALYSIS ONLY" in cf.operational_constraints
    assert "DO NOT TASK" in cf.operational_constraints
    assert cf.ledger.current_state == AssetStatus.UNKNOWN

def test_update_analysis():
    cf = CounterintelligenceCaseFile(case_id="CF-002", asset_ids=["asset-c"])
    cf.update_analysis(
        access="Can observe botnet C2 traffic",
        motivation="Financial gain",
        vulnerability="Poor opsec",
        intelligence_value="Early warning for DDoS campaigns"
    )

    assert cf.access == "Can observe botnet C2 traffic"
    assert cf.motivation == "Financial gain"
    assert cf.vulnerability == "Poor opsec"
    assert cf.intelligence_value == "Early warning for DDoS campaigns"
