# SWE-rebench Standards Mapping

| Standard         | Role                      |
| ---------------- | ------------------------- |
| SWE-bench format | task schema               |
| Docker OCI       | reproducible environments |
| Git patch format | solution representation   |

## Import matrix

| Source                 | Format     |
| ---------------------- | ---------- |
| SWE-rebench V2 dataset | parquet    |
| GitHub repos           | git        |
| Docker registry        | OCI images |

## Export matrix

| Artifact          | Format |
| ----------------- | ------ |
| evaluation report | JSON   |
| leaderboard       | CSV    |
| CI artifacts      | JSON   |

Non-goals:
* training new foundation models
* code synthesis model training
