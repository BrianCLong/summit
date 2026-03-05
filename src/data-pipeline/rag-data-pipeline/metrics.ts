export interface PipelineMetrics {
  chunk_count: number;
  avg_chunk_tokens: number;
  embedding_time_ms: number;
}

export class MetricsCollector {
  private startTime: number = 0;

  startTimer() {
    this.startTime = Date.now();
  }

  stopTimer(): number {
    return Date.now() - this.startTime;
  }

  generateMetrics(chunksCount: number, avgTokens: number, embedTime: number): PipelineMetrics {
    return {
      chunk_count: chunksCount,
      avg_chunk_tokens: avgTokens,
      embedding_time_ms: embedTime
    };
  }
}
