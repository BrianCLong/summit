#!/usr/bin/env python3
"""
Example Workflow: Intel Image Processing to Graph Nodes
-----------------------------------------------------
This script demonstrates the workflow for:
1. Processing an image using the existing YOLOv8 integration.
2. Parsing the detection results.
3. Generating corresponding Graph Nodes (Cypher queries) for an IntelGraph.

Usage:
    python3 scripts/example_yolo_workflow.py --image path/to/image.jpg
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime

# Configuration
YOLO_SCRIPT = "server/src/ai/models/yolo_detection.py"

def run_detection(image_path):
    """
    Executes the existing YOLO detection script.
    """
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return None

    if not os.path.exists(YOLO_SCRIPT):
        print(f"Error: YOLO script not found at {YOLO_SCRIPT}")
        return None

    cmd = [
        sys.executable,
        YOLO_SCRIPT,
        "--image", image_path,
        "--model", "yolov8n.pt", # Defaulting to nano model
        "--confidence", "0.5"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Detection failed: {e.stderr}")
        return None
    except json.JSONDecodeError:
        print(f"Failed to parse detection output: {result.stdout}")
        return None

def generate_graph_nodes(image_path, detection_result, investigation_id="inv-123"):
    """
    Transforms detection results into IntelGraph nodes (conceptually).
    Returns a list of Cypher queries.
    """
    if not detection_result or "detections" not in detection_result:
        return []

    queries = []

    # 1. Create the Image Node
    image_id = str(uuid.uuid4())
    queries.append(f"""
    MERGE (i:Image {{id: '{image_id}'}})
    ON CREATE SET i.path = '{image_path}',
                  i.timestamp = '{datetime.now().isoformat()}',
                  i.investigation_id = '{investigation_id}'
    """)

    # 2. Create Object Nodes and Relationships
    for det in detection_result["detections"]:
        class_name = det["class_name"]
        confidence = det["confidence"]
        bbox = det["bbox"] # [x, y, w, h]

        # Create a unique ID for the detected object instance
        object_id = str(uuid.uuid4())

        # Cypher to create the Object node and link it to the Image
        # We use a generic :Object label, and a specific label based on the class (e.g., :Car)
        query = f"""
        CREATE (o:Object:{class_name.capitalize()} {{
            id: '{object_id}',
            class: '{class_name}',
            confidence: {confidence},
            bbox: {json.dumps(bbox)},
            source_model: '{detection_result.get('model', 'unknown')}'
        }})
        CREATE (i)-[:DEPICTS {{confidence: {confidence}}}]->(o)
        """
        queries.append(query.strip())

    return queries

def main():
    parser = argparse.ArgumentParser(description="Simulate Image-to-Graph Workflow")
    parser.add_argument("--image", required=True, help="Path to the input image")
    args = parser.parse_args()

    print(f"[*] Starting workflow for: {args.image}")

    # Step 1: Object Detection
    print(f"[*] Running YOLOv8 detection...")
    result = run_detection(args.image)

    if result:
        det_count = len(result.get("detections", []))
        print(f"[*] Detection complete. Found {det_count} objects.")

        # Step 2: Graph Node Generation
        print(f"[*] Generating Graph Nodes...")
        cypher_queries = generate_graph_nodes(args.image, result)

        print("\n--- Generated Cypher Queries ---")
        for q in cypher_queries:
            print(q)
            print("---")

        print(f"[*] Workflow complete. {len(cypher_queries)} queries generated.")
    else:
        print("[!] Workflow failed during detection.")

if __name__ == "__main__":
    main()
