import fs from 'fs';
// inputs: judgments.tsv (query 	 doc 	 label), run_v1.txt, run_v2.txt
// outputs: ndcg@10, map@10; fail if v2 < v1 * 0.98
