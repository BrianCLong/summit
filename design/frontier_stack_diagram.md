# Frontier Training Stack Architecture

```mermaid
graph TD
    subgraph Data Layer
        D1[Raw Sources<br/>Web, Code, Tools, Graph] --> D2[Ingestion & Filtering]
        D2 --> D3[Tokenization & Sharding]
        D3 --> D4[Streaming DataLoader]
        C[Curriculum Engine] -->|Adjusts Weights| D4
    end

    subgraph Training Runtime
        T1[Trainer Loop<br/>PyTorch/FSDP] --> T2[Model Forward/Backward]
        D4 -->|Batches| T1
        T2 -->|Gradients| T3[Optimizer]
        T3 -->|Updates| T2
    end

    subgraph Telemetry & Feedback
        T2 -->|Loss, Norms, Entropy| M1[Telemetry Collector]
        M1 -->|Live Metrics| C
        M1 -->|Logs| M2[Observability DB]
    end

    subgraph Evaluation
        E1[Eval Harness] -->|Checkpoints| T1
        E1 -->|Score| M2
        T1 -->|Save| E2[Model Registry]
    end

    style C fill:#f9f,stroke:#333,stroke-width:2px
    style M1 fill:#ccf,stroke:#333,stroke-width:2px
```

## Description
The stack is designed with a closed feedback loop. Unlike traditional pipelines where the dataset is fixed, the **Curriculum Engine** dynamically adjusts the sampling weights of the **Streaming DataLoader** based on real-time signals from the **Telemetry Collector**.

- **Data Layer:** Ingests diverse sources. The key innovation is the `Curriculum Engine` which modulates the mix.
- **Training Runtime:** Standard PyTorch FSDP loop, but instrumented to emit granular internal metrics.
- **Telemetry & Feedback:** Captures not just loss, but "uncertainty" (entropy) and stability signals to drive the curriculum.
- **Evaluation:** Periodic checks to ensure the curriculum isn't overfitting or degrading general capabilities.
