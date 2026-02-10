import hashlib
import json
import re
import time
import os
from dataclasses import asdict
from typing import List, Tuple
from .schema import Report, Metrics, Stamp, EvidenceItem, Method, MethodStep, AssetBrief

def _hash_content(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def _generate_evidence_id(slug: str, stage: str, index: int) -> str:
    return f"EVID:{slug}:{stage}:{index:04d}"

def detect_moments_of_clarity(text: str, slug: str) -> List[EvidenceItem]:
    moments = []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    offset = 0
    idx = 0
    for sentence in sentences:
        s_lower = sentence.lower()
        if any(keyword in s_lower for keyword in ['realized', 'clarity', 'key', 'insight', 'moment', 'discovered']):
            moments.append(EvidenceItem(
                id=_generate_evidence_id(slug, 'MOC', idx),
                text=sentence.strip(),
                offset=offset
            ))
            idx += 1
        offset += len(sentence) + 1
    return moments

def extract_signature_methods(text: str, slug: str) -> List[Method]:
    methods = []
    lines = text.split('\n')
    current_steps = []
    step_num = 1

    for line in lines:
        line = line.strip()
        match = re.match(r'^(\d+\.|Step \d+[:\s])\s*(.*)', line)
        if match:
            current_steps.append(MethodStep(step_number=step_num, description=match.group(2)))
            step_num += 1

    if current_steps:
        methods.append(Method(
            id=_generate_evidence_id(slug, 'METH', 0),
            name="Extracted Method",
            steps=current_steps
        ))
    return methods

def compile_ip_asset_brief(moments: List[EvidenceItem], methods: List[Method]) -> AssetBrief:
    title = "IP Asset Brief"
    summary = f"Extracted {len(moments)} moments of clarity and {len(methods)} signature methods."
    return AssetBrief(title=title, summary=summary)

def run_ip_capture(input_path: str, output_dir: str, slug: str = 'ip-capture'):
    start_time = time.time()

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    redacted_content = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', content)

    orig_emails = len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', content))
    final_emails = len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', redacted_content))
    redaction_count = orig_emails - final_emails
    if redaction_count < 0: redaction_count = 0

    moments = detect_moments_of_clarity(redacted_content, slug)
    methods = extract_signature_methods(redacted_content, slug)
    brief = compile_ip_asset_brief(moments, methods)

    report = Report(moments=moments, methods=methods, brief=brief)

    duration_ms = int((time.time() - start_time) * 1000)

    metrics = Metrics(
        input_tokens=len(content) // 4,
        output_tokens=len(report.to_json()) // 4,
        redaction_count=redaction_count,
        duration_ms=duration_ms
    )

    stamp = Stamp(
        pipeline_version='1.0.0',
        model_id='heuristic-v1',
        corpus_hash=_hash_content(content)
    )

    os.makedirs(output_dir, exist_ok=True)

    with open(os.path.join(output_dir, 'report.json'), 'w', encoding='utf-8') as f:
        f.write(report.to_json(indent=2))

    with open(os.path.join(output_dir, 'metrics.json'), 'w', encoding='utf-8') as f:
        f.write(metrics.to_json(indent=2))

    with open(os.path.join(output_dir, 'stamp.json'), 'w', encoding='utf-8') as f:
        f.write(stamp.to_json(indent=2))

    return report, metrics, stamp
