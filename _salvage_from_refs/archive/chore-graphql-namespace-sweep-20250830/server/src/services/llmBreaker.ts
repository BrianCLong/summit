import CircuitBreaker from "opossum";
export function wrapStream<TArgs extends any[]>(
  fn: (...args:TArgs)=>AsyncGenerator<string>
){
  const breaker = new CircuitBreaker(async function* (...args:TArgs) {
    for await (const t of fn(...args)) yield t;
  }, { errorThresholdPercentage: 50, resetTimeout: 5000, rollingCountTimeout: 10000 });
  return breaker;
}
