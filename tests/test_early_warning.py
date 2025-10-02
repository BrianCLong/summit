import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from analysis.early_warning import score_alert


class _StubText:
    def predict_proba(self, _text):
        return {"score": 0.6, "explain": "text"}


class _StubAV:
    def detect(self, _bytes):
        return {"score": 0.3, "explain": "av"}


class _StubMeta:
    def score(self, _metadata):
        return {"score": 0.9, "explain": "meta"}


class _Models:
    text_clf = _StubText()
    av_forgery = _StubAV()
    meta_anom = _StubMeta()


class _Policy:
    def reasoner(self, evidence):
        return {"status": "allow", "source": evidence.get("provenance_chain", [])}


def test_score_alert_combines_models():
    evidence = {
        "transcript": "hello",
        "media_bytes": b"",
        "metadata": {},
        "provenance_chain": ["src"],
    }
    alert = score_alert(evidence, _Models(), _Policy())

    assert alert["risk_score"] == 0.56
    assert alert["disagreement"] == 0.245
    assert alert["uncertainty"] == 0.203
    assert alert["provenance"] == ["src"]
    assert alert["policy_gate"]["status"] == "allow"
    assert alert["model_weights"] == {"text": 1.0, "av": 1.0, "meta": 1.0}
    assert alert["posterior"] == {"alpha": 2.8, "beta": 2.2}
    assert alert["evidence_mean"] == 0.6


class _WeightedText:
    def predict_proba(self, _text):
        return {"score": 0.8, "confidence": 3.0, "explain": "text"}


class _WeightedAV:
    def detect(self, _bytes):
        return {"score": 0.2, "confidence": 0.1, "explain": "av"}


class _WeightedMeta:
    def score(self, _metadata):
        return {"score": 0.4, "explain": "meta"}


class _WeightedModels:
    text_clf = _WeightedText()
    av_forgery = _WeightedAV()
    meta_anom = _WeightedMeta()


def test_score_alert_respects_confidence_weights():
    evidence = {"transcript": "", "media_bytes": b"", "metadata": {}}

    alert = score_alert(evidence, _WeightedModels(), _Policy())

    assert alert["risk_score"] == 0.626
    assert alert["disagreement"] == 0.188
    assert alert["model_weights"] == {"text": 3.0, "av": 0.1, "meta": 1.0}
    assert alert["posterior"] == {"alpha": 3.82, "beta": 2.28}
