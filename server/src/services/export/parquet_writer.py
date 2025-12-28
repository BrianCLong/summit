# services/export/parquet_writer.py
import sys
import json
import pyarrow as pa
import pyarrow.parquet as pq

def write_parquet(rows, schema_fields, out_path):
    try:
        # Construct PyArrow schema from dict definition
        # schema_fields example: [{'name': 'id', 'type': 'string'}, {'name': 'val', 'type': 'int64'}]

        pa_fields = []
        for field in schema_fields:
            if field['type'] == 'string':
                pa_fields.append((field['name'], pa.string()))
            elif field['type'] == 'int64':
                pa_fields.append((field['name'], pa.int64()))
            elif field['type'] == 'float64':
                pa_fields.append((field['name'], pa.float64()))
            elif field['type'] == 'bool':
                pa_fields.append((field['name'], pa.bool_()))
            # Add more types as needed

        schema = pa.schema(pa_fields)

        table = pa.Table.from_pylist(rows, schema=schema)
        pq.write_table(table, out_path)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Expects JSON input from stdin with structure:
    # { "rows": [...], "schema": [...], "outPath": "..." }
    try:
        input_data = json.load(sys.stdin)
        write_parquet(input_data['rows'], input_data['schema'], input_data['outPath'])
    except Exception as e:
        print(f"FATAL: {str(e)}", file=sys.stderr)
        sys.exit(1)
