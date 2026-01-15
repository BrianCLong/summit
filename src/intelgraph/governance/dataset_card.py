from dataclasses import dataclass


@dataclass
class DatasetCard:
    name: str
    source: str
    license: str
    pii_notes: str
    intended_use: str
    limitations: str

    def to_markdown(self) -> str:
        return f"""# Dataset Card: {self.name}

## Metadata
- **Source**: {self.source}
- **License**: {self.license}

## PII Notes
{self.pii_notes}

## Intended Use
{self.intended_use}

## Limitations
{self.limitations}
"""
