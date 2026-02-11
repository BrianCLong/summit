import csv
import sys

def validate_backlog(file_path):
    required_columns = ['ID', 'Epic', 'Title', 'Component', 'AcceptanceCriteria', 'Dependencies', 'Risk', 'Effort', 'Owner', 'Priority', 'Status']

    try:
        with open(file_path, mode='r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)

            # Check for required columns
            if not all(col in reader.fieldnames for col in required_columns):
                missing = [col for col in required_columns if col not in reader.fieldnames]
                print(f"Error: Missing columns: {missing}")
                return False

            row_count = 0
            for i, row in enumerate(reader, 1):
                row_count += 1
                # Check for empty critical fields
                critical_fields = ['ID', 'Epic', 'Title', 'AcceptanceCriteria', 'Owner', 'Status']
                for field in critical_fields:
                    if not row.get(field) or row[field].strip() == "":
                        print(f"Error: Empty critical field '{field}' at row {i}")
                        return False

            if row_count < 200:
                print(f"Error: Backlog has only {row_count} tasks, expected >= 200")
                return False

            print(f"Validation successful: {row_count} tasks verified.")
            return True

    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return False

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else 'backlog/intelgraph/tasks.csv'
    if not validate_backlog(path):
        sys.exit(1)
