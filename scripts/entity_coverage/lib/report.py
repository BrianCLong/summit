import json
import os

class ReportGenerator:
    def __init__(self, data, output_dir):
        self.data = data
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate(self):
        self._save_json()
        self._save_markdown()

    def _save_json(self):
        filepath = os.path.join(self.output_dir, 'entity_coverage_report.json')
        with open(filepath, 'w') as f:
            json.dump(self.data, f, indent=2)

    def _save_markdown(self):
        filepath = os.path.join(self.output_dir, 'entity_coverage_report.md')
        with open(filepath, 'w') as f:
            f.write("# Entity Coverage Analysis Report\n\n")

            # Summary
            f.write("## Summary\n")
            doc_cov = self.data['document_coverage']
            f.write(f"- **Total Documents**: {doc_cov['total_documents']}\n")
            f.write(f"- **Documents with Entities**: {doc_cov['documents_with_entities']} ({doc_cov['coverage_percentage']}%)\n")
            f.write(f"- **Avg Entities per Doc**: {self.data['entity_density']['average_entities_per_doc']}\n\n")

            # Entity Counts
            f.write("## Entity Distribution by Type (PostgreSQL)\n")
            f.write("| Type | Count |\n")
            f.write("| --- | --- |\n")
            for kind, count in sorted(self.data['entity_counts'].items()):
                f.write(f"| {kind} | {count} |\n")
            f.write("\n")

            if self.data.get('kg_entity_counts'):
                f.write("## Entity Distribution by Type (Neo4j Knowledge Graph)\n")
                f.write("| Type | Count |\n")
                f.write("| --- | --- |\n")
                for kind, count in sorted(self.data['kg_entity_counts'].items()):
                    f.write(f"| {kind} | {count} |\n")
                f.write("\n")

            # Density Distribution
            f.write("## Entity Density Distribution\n")
            f.write("| Bucket (Entities/Doc) | Count |\n")
            f.write("| --- | --- |\n")
            dist = self.data['entity_density']['distribution']
            # Logical sorting for buckets
            order = ["0", "1-5", "6-10", "11-20", "21+"]
            for bucket in order:
                if bucket in dist:
                    f.write(f"| {bucket} | {dist[bucket]} |\n")
            f.write("\n")

            # Domain Coverage
            f.write("## Coverage by Domain\n")
            f.write("| Domain | Total Docs | Coverage % |\n")
            f.write("| --- | --- | --- |\n")
            for domain in sorted(self.data['domain_coverage'], key=lambda x: x['domain']):
                f.write(f"| {domain['domain']} | {domain['total_documents']} | {domain['coverage_percentage']}% |\n")
            f.write("\n")

            # Recommendations
            f.write("## Recommendations\n")
            if doc_cov['coverage_percentage'] < 50:
                f.write("- **Low overall coverage**: Extraction pipeline might be underperforming or documents are sparse. Review NER model performance.\n")

            deserts_count = len(self.data['entity_deserts'])
            if deserts_count > 0:
                f.write(f"- **Address Entity Deserts**: {deserts_count} documents have zero entities. ")
                f.write("Samples: ")
                f.write(", ".join([d['title'] or d['id'] for d in self.data['entity_deserts'][:5]]))
                f.write("\n")

            # Type Imbalance
            counts = self.data['entity_counts'].values()
            if counts:
                max_count = max(counts)
                min_count = min(counts)
                if max_count > min_count * 10:
                    f.write("- **Type Imbalance Detected**: Some entity types are significantly more frequent than others. Validate if this reflects reality or extraction bias.\n")
