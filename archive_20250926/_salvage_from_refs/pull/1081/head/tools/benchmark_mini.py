#!/usr/bin/env python3
"""
Benchmark Mini: Continuous Model Optimization Suite
Lightweight, automated benchmarking for model performance optimization
"""
import json, os, sys, time, random, statistics, hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_DIR = ROOT / "benchmarks"
RESULTS_DIR = ROOT / "data" / "benchmark_results"

class BenchmarkSuite:
    def __init__(self):
        self.ensure_dirs()
        self.load_benchmark_suite()
    
    def ensure_dirs(self):
        """Ensure benchmark directories exist"""
        for path in [BENCHMARK_DIR, RESULTS_DIR]:
            path.mkdir(parents=True, exist_ok=True)
    
    def load_benchmark_suite(self):
        """Load or create benchmark test suite"""
        self.benchmarks = {
            "speed_tests": [
                {"task": "nl2cypher", "prompt": "CREATE constraint for User.email", "max_tokens": 100, "temperature": 0.0},
                {"task": "summary", "prompt": "Summarize: The quick brown fox jumps over the lazy dog.", "max_tokens": 50, "temperature": 0.1},
                {"task": "code", "prompt": "Write Python function to reverse a string", "max_tokens": 150, "temperature": 0.0},
                {"task": "reasoning", "prompt": "If it takes 5 machines 5 minutes to make 5 widgets, how long for 100 machines to make 100 widgets?", "max_tokens": 100, "temperature": 0.2}
            ],
            "quality_tests": [
                {"task": "code", "prompt": "Implement quicksort in Python with comments", "expected_contains": ["def", "quicksort", "partition"], "max_tokens": 300},
                {"task": "cypher", "prompt": "Create a Cypher query to find users with most connections", "expected_contains": ["MATCH", "COUNT", "ORDER BY"], "max_tokens": 150},
                {"task": "reasoning", "prompt": "Explain why the sky is blue in simple terms", "expected_contains": ["light", "scattering", "blue"], "max_tokens": 200}
            ],
            "consistency_tests": [
                {"task": "deterministic", "prompt": "What is 2+2?", "expected_exact": "4", "temperature": 0.0, "runs": 5},
                {"task": "formatting", "prompt": "Format this JSON: {'name':'test','value':123}", "temperature": 0.0, "runs": 3}
            ],
            "stress_tests": [
                {"task": "concurrent", "prompt": "Generate a haiku about technology", "concurrent_requests": 5, "max_tokens": 100},
                {"task": "long_context", "prompt": "Analyze this text: " + "Lorem ipsum dolor sit amet. " * 100, "max_tokens": 200}
            ]
        }
    
    def get_available_models(self) -> List[str]:
        """Get list of available models from capabilities"""
        try:
            models_caps_path = ROOT / "models_caps.yml"
            if models_caps_path.exists():
                import yaml
                with open(models_caps_path, 'r') as f:
                    caps = yaml.safe_load(f)
                return list(caps.get("providers", {}).keys())
        except Exception:
            pass
        
        # Fallback: try to query LiteLLM
        try:
            result = subprocess.run([
                "curl", "-s", "http://127.0.0.1:4000/v1/models"
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                models_data = json.loads(result.stdout)
                return [m["id"] for m in models_data.get("data", [])]
        except Exception:
            pass
        
        return ["local/llama"]  # Ultimate fallback
    
    def run_single_benchmark(self, model: str, benchmark: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single benchmark test"""
        start_time = time.time()
        
        try:
            # Prepare command
            cmd = [
                "python3", str(ROOT / "tools" / "ask_with_pack.py"),
                benchmark["task"],
                benchmark["prompt"]
            ]
            
            # Set environment variables
            env = os.environ.copy()
            env["MODEL"] = model
            if "temperature" in benchmark:
                env["TEMPERATURE"] = str(benchmark["temperature"])
            
            # Run benchmark
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            # Parse result
            success = result.returncode == 0
            response = result.stdout.strip() if success else result.stderr.strip()
            
            # Calculate metrics
            metrics = {
                "success": success,
                "duration_ms": duration_ms,
                "response_length": len(response),
                "words_per_second": len(response.split()) / (duration_ms / 1000) if duration_ms > 0 else 0,
                "chars_per_second": len(response) / (duration_ms / 1000) if duration_ms > 0 else 0
            }
            
            # Quality checks
            if "expected_contains" in benchmark:
                contains_all = all(term.lower() in response.lower() for term in benchmark["expected_contains"])
                metrics["quality_score"] = 1.0 if contains_all else 0.0
                metrics["missing_terms"] = [term for term in benchmark["expected_contains"] 
                                          if term.lower() not in response.lower()]
            
            if "expected_exact" in benchmark:
                metrics["exactness_score"] = 1.0 if response.strip() == benchmark["expected_exact"] else 0.0
            
            return {
                "model": model,
                "benchmark_id": benchmark.get("task", "unknown"),
                "prompt_hash": hashlib.md5(benchmark["prompt"].encode()).hexdigest()[:8],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request": {
                    "prompt": benchmark["prompt"][:100] + "..." if len(benchmark["prompt"]) > 100 else benchmark["prompt"],
                    "task": benchmark["task"],
                    "temperature": benchmark.get("temperature", 0.2)
                },
                "response": {
                    "text": response[:500] + "..." if len(response) > 500 else response,
                    "success": success,
                    "error": result.stderr if not success else None
                },
                "metrics": metrics
            }
            
        except subprocess.TimeoutExpired:
            return {
                "model": model,
                "benchmark_id": benchmark.get("task", "unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request": benchmark,
                "response": {"text": "", "success": False, "error": "timeout"},
                "metrics": {"success": False, "duration_ms": 30000, "timeout": True}
            }
        except Exception as e:
            return {
                "model": model,
                "benchmark_id": benchmark.get("task", "unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request": benchmark,
                "response": {"text": "", "success": False, "error": str(e)},
                "metrics": {"success": False, "duration_ms": 0, "error": str(e)}
            }
    
    def run_consistency_test(self, model: str, benchmark: Dict[str, Any]) -> Dict[str, Any]:
        """Run consistency test with multiple runs"""
        runs = benchmark.get("runs", 3)
        results = []
        
        for i in range(runs):
            result = self.run_single_benchmark(model, benchmark)
            results.append(result)
            time.sleep(0.5)  # Brief pause between runs
        
        # Analyze consistency
        responses = [r["response"]["text"] for r in results if r["metrics"]["success"]]
        durations = [r["metrics"]["duration_ms"] for r in results if r["metrics"]["success"]]
        
        consistency_metrics = {
            "total_runs": runs,
            "successful_runs": len(responses),
            "success_rate": len(responses) / runs,
            "response_consistency": len(set(responses)) / len(responses) if responses else 0,
            "duration_consistency": 1.0 - (statistics.stdev(durations) / statistics.mean(durations)) if len(durations) > 1 else 1.0,
            "avg_duration_ms": statistics.mean(durations) if durations else 0
        }
        
        return {
            "model": model,
            "benchmark_type": "consistency",
            "benchmark_id": benchmark["task"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "runs": results,
            "consistency_metrics": consistency_metrics
        }
    
    def run_concurrent_test(self, model: str, benchmark: Dict[str, Any]) -> Dict[str, Any]:
        """Run concurrent stress test"""
        concurrent_count = benchmark.get("concurrent_requests", 3)
        
        # Launch concurrent processes
        import threading
        results = []
        start_time = time.time()
        
        def run_concurrent():
            result = self.run_single_benchmark(model, benchmark)
            results.append(result)
        
        threads = []
        for _ in range(concurrent_count):
            thread = threading.Thread(target=run_concurrent)
            threads.append(thread)
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join(timeout=45)  # 45s timeout per thread
        
        end_time = time.time()
        total_duration = (end_time - start_time) * 1000
        
        successful_results = [r for r in results if r["metrics"]["success"]]
        
        concurrent_metrics = {
            "concurrent_requests": concurrent_count,
            "successful_requests": len(successful_results),
            "success_rate": len(successful_results) / concurrent_count,
            "total_duration_ms": total_duration,
            "avg_latency_ms": statistics.mean([r["metrics"]["duration_ms"] for r in successful_results]) if successful_results else 0,
            "throughput_rps": len(successful_results) / (total_duration / 1000) if total_duration > 0 else 0
        }
        
        return {
            "model": model,
            "benchmark_type": "concurrent",
            "benchmark_id": benchmark["task"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "concurrent_results": results,
            "concurrent_metrics": concurrent_metrics
        }
    
    def run_benchmark_suite(self, models: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run complete benchmark suite"""
        if models is None:
            models = self.get_available_models()
        
        print(f"🏁 Starting benchmark suite for {len(models)} models...")
        
        suite_results = {
            "suite_id": hashlib.md5(f"{datetime.now().isoformat()}{models}".encode()).hexdigest()[:12],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "models_tested": models,
            "results": {}
        }
        
        for model in models:
            print(f"\n🔬 Testing model: {model}")
            model_results = {
                "speed_tests": [],
                "quality_tests": [],
                "consistency_tests": [],
                "stress_tests": []
            }
            
            # Speed tests
            print("  ⚡ Speed tests...")
            for benchmark in self.benchmarks["speed_tests"]:
                result = self.run_single_benchmark(model, benchmark)
                model_results["speed_tests"].append(result)
                print(f"    {benchmark['task']}: {result['metrics']['duration_ms']:.0f}ms")
            
            # Quality tests
            print("  🎯 Quality tests...")
            for benchmark in self.benchmarks["quality_tests"]:
                result = self.run_single_benchmark(model, benchmark)
                model_results["quality_tests"].append(result)
                quality_score = result["metrics"].get("quality_score", 0)
                print(f"    {benchmark['task']}: {quality_score:.1%} quality")
            
            # Consistency tests
            print("  🔄 Consistency tests...")
            for benchmark in self.benchmarks["consistency_tests"]:
                result = self.run_consistency_test(model, benchmark)
                model_results["consistency_tests"].append(result)
                consistency = result["consistency_metrics"]["response_consistency"]
                print(f"    {benchmark['task']}: {consistency:.1%} consistency")
            
            # Stress tests
            print("  💪 Stress tests...")
            for benchmark in self.benchmarks["stress_tests"]:
                if "concurrent_requests" in benchmark:
                    result = self.run_concurrent_test(model, benchmark)
                else:
                    result = self.run_single_benchmark(model, benchmark)
                model_results["stress_tests"].append(result)
                
                if "concurrent_metrics" in result:
                    rps = result["concurrent_metrics"]["throughput_rps"]
                    print(f"    {benchmark['task']}: {rps:.2f} RPS")
                else:
                    duration = result["metrics"]["duration_ms"]
                    print(f"    {benchmark['task']}: {duration:.0f}ms")
            
            suite_results["results"][model] = model_results
        
        # Generate comparative analysis
        suite_results["analysis"] = self.analyze_benchmark_results(suite_results)
        
        # Save results
        results_file = RESULTS_DIR / f"benchmark_{suite_results['suite_id']}.json"
        with open(results_file, 'w') as f:
            json.dump(suite_results, f, indent=2)
        
        print(f"\n📊 Benchmark suite complete! Results saved to {results_file}")
        return suite_results
    
    def analyze_benchmark_results(self, suite_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze and rank model performance"""
        models = list(suite_results["results"].keys())
        analysis = {
            "model_rankings": {},
            "performance_summary": {},
            "recommendations": []
        }
        
        # Calculate composite scores for each model
        for model in models:
            results = suite_results["results"][model]
            
            # Speed score (inverse of average duration)
            speed_durations = [r["metrics"]["duration_ms"] for r in results["speed_tests"] if r["metrics"]["success"]]
            speed_score = 1000 / statistics.mean(speed_durations) if speed_durations else 0
            
            # Quality score
            quality_scores = [r["metrics"].get("quality_score", 0) for r in results["quality_tests"]]
            quality_score = statistics.mean(quality_scores) if quality_scores else 0
            
            # Reliability score
            all_results = results["speed_tests"] + results["quality_tests"] + results["stress_tests"]
            success_rate = sum(1 for r in all_results if r["metrics"]["success"]) / len(all_results)
            
            # Consistency score
            consistency_scores = [r["consistency_metrics"]["response_consistency"] for r in results["consistency_tests"]]
            consistency_score = statistics.mean(consistency_scores) if consistency_scores else 0
            
            # Composite score
            composite_score = (
                speed_score * 0.3 + 
                quality_score * 0.3 + 
                success_rate * 0.25 + 
                consistency_score * 0.15
            )
            
            analysis["performance_summary"][model] = {
                "speed_score": round(speed_score, 2),
                "quality_score": round(quality_score, 2),
                "reliability_score": round(success_rate, 2),
                "consistency_score": round(consistency_score, 2),
                "composite_score": round(composite_score, 2),
                "avg_latency_ms": round(statistics.mean(speed_durations), 0) if speed_durations else "N/A"
            }
        
        # Rank models by composite score
        ranked_models = sorted(
            analysis["performance_summary"].items(),
            key=lambda x: x[1]["composite_score"],
            reverse=True
        )
        
        analysis["model_rankings"] = {
            f"rank_{i+1}": {"model": model, **metrics}
            for i, (model, metrics) in enumerate(ranked_models)
        }
        
        # Generate recommendations
        if ranked_models:
            best_model = ranked_models[0][0]
            worst_model = ranked_models[-1][0]
            
            analysis["recommendations"] = [
                f"🏆 Top performer: {best_model} (composite score: {ranked_models[0][1]['composite_score']})",
                f"⚡ Fastest: {min(analysis['performance_summary'].items(), key=lambda x: x[1]['avg_latency_ms'] if isinstance(x[1]['avg_latency_ms'], (int, float)) else float('inf'))[0]}",
                f"🎯 Highest quality: {max(analysis['performance_summary'].items(), key=lambda x: x[1]['quality_score'])[0]}",
                f"🔧 Needs improvement: {worst_model}" if len(ranked_models) > 1 else "All models performing well"
            ]
        
        return analysis

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Benchmark Mini: Continuous Model Optimization")
    parser.add_argument("--models", nargs="+", help="Specific models to benchmark")
    parser.add_argument("--quick", action="store_true", help="Run quick benchmark (speed tests only)")
    parser.add_argument("--report", help="Generate report from existing results file")
    
    args = parser.parse_args()
    
    suite = BenchmarkSuite()
    
    if args.report:
        # Load and display existing results
        with open(args.report, 'r') as f:
            results = json.load(f)
        
        print(f"📋 Benchmark Report: {results['suite_id']}")
        print(f"📅 Run Date: {results['timestamp']}")
        print(f"🔬 Models Tested: {', '.join(results['models_tested'])}")
        
        if "analysis" in results:
            analysis = results["analysis"]
            print("\n🏆 Model Rankings:")
            for rank, data in analysis["model_rankings"].items():
                print(f"  {rank}: {data['model']} (score: {data['composite_score']})")
            
            print("\n💡 Recommendations:")
            for rec in analysis["recommendations"]:
                print(f"  {rec}")
        
    else:
        # Run new benchmark
        if args.quick:
            # Quick mode: only speed tests
            models = args.models if args.models else suite.get_available_models()
            print("🚀 Quick benchmark mode: speed tests only")
            
            for model in models:
                print(f"\n⚡ Testing {model}:")
                for benchmark in suite.benchmarks["speed_tests"]:
                    result = suite.run_single_benchmark(model, benchmark)
                    duration = result["metrics"]["duration_ms"]
                    success = "✓" if result["metrics"]["success"] else "✗"
                    print(f"  {benchmark['task']}: {duration:.0f}ms {success}")
        else:
            # Full benchmark suite
            results = suite.run_benchmark_suite(args.models)
            
            # Display summary
            if "analysis" in results:
                analysis = results["analysis"]
                print("\n🏆 Final Rankings:")
                for rank, data in analysis["model_rankings"].items():
                    print(f"  {rank}: {data['model']} (composite: {data['composite_score']}, latency: {data['avg_latency_ms']}ms)")
                
                print("\n💡 Key Recommendations:")
                for rec in analysis["recommendations"]:
                    print(f"  {rec}")

if __name__ == "__main__":
    main()