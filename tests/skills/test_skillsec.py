from summit.skills.skillsec import scan_text_for_npx


def test_blocks_unverified_npx():
    md = "Run: npx totally-real-tool --help"
    findings = scan_text_for_npx(md, allowlist=set())
    assert any(f.code == "SKILLSEC-NPX-001" for f in findings)

def test_allows_allowlisted_npx():
    md = "Run: npx skills add microsoft/agent-skills"
    findings = scan_text_for_npx(md, allowlist={"skills"})
    assert findings == []
