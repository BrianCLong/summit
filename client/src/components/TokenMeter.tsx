/**
 * TokenMeter - Real-time token counting widget
 * Shows live token count and cost estimates for prompt editors
 */

import React, { useEffect, useState, useMemo } from 'react';
import { debounce } from 'lodash';

interface TokenMeterProps {
  provider?: string;
  model: string;
  text: string;
  completion?: string;
  showCost?: boolean;
  showWarnings?: boolean;
  className?: string;
  onBudgetChange?: (status: 'proceed' | 'warn' | 'block') => void;
}

interface TokenCountResult {
  model: string;
  prompt: number;
  completion?: number;
  total: number;
  estimatedCostUSD?: number;
  budget?: {
    limit: number;
    withinBudget: boolean;
    percentUsed: number;
    recommendAction: 'proceed' | 'warn' | 'block';
  };
}

export function TokenMeter({
  provider,
  model,
  text,
  completion,
  showCost = true,
  showWarnings = true,
  className = '',
  onBudgetChange,
}: TokenMeterProps) {
  const [count, setCount] = useState<TokenCountResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced token counting to avoid excessive API calls
  const debouncedCount = useMemo(
    () =>
      debounce(
        async (
          provider: string | undefined,
          model: string,
          text: string,
          completion?: string,
        ) => {
          if (!model || !text.trim()) {
            setCount(null);
            setLoading(false);
            return;
          }

          try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/tokcount', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                provider,
                model,
                prompt: text,
                completion,
              }),
            });

            if (!response.ok) {
              throw new Error(`Token counting failed: ${response.status}`);
            }

            const result: TokenCountResult = await response.json();
            setCount(result);

            // Notify parent of budget status change
            if (onBudgetChange && result.budget) {
              onBudgetChange(result.budget.recommendAction);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            // Fallback estimation
            const estimatedTokens = Math.max(1, Math.round(text.length / 4));
            setCount({
              model,
              prompt: estimatedTokens,
              completion: completion
                ? Math.round(completion.length / 4)
                : undefined,
              total:
                estimatedTokens +
                (completion ? Math.round(completion.length / 4) : 0),
              estimatedCostUSD: 0,
            });
          } finally {
            setLoading(false);
          }
        },
        500,
      ),
    [onBudgetChange],
  );

  useEffect(() => {
    debouncedCount(provider, model, text, completion);

    return () => {
      debouncedCount.cancel();
    };
  }, [provider, model, text, completion, debouncedCount]);

  if (!count) {
    return loading ? (
      <div className={`text-xs opacity-60 ${className}`}>
        Counting tokens...
      </div>
    ) : null;
  }

  const getBudgetColor = () => {
    if (!count.budget) return 'text-gray-500';
    switch (count.budget.recommendAction) {
      case 'block':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  const getBudgetIcon = () => {
    if (!count.budget) return null;
    switch (count.budget.recommendAction) {
      case 'block':
        return '🚫';
      case 'warn':
        return '⚠️';
      default:
        return '✅';
    }
  };

  return (
    <div
      className={`flex items-center gap-2 text-xs ${getBudgetColor()} ${className}`}
    >
      {loading && <span className="animate-pulse">⏳</span>}

      {getBudgetIcon() && <span>{getBudgetIcon()}</span>}

      <span>{count.total.toLocaleString()} tokens</span>

      {count.completion && (
        <span className="opacity-75">
          ({count.prompt.toLocaleString()} + {count.completion.toLocaleString()}
          )
        </span>
      )}

      {showCost && count.estimatedCostUSD && count.estimatedCostUSD > 0 && (
        <span className="opacity-75">
          ≈ ${count.estimatedCostUSD.toFixed(4)}
        </span>
      )}

      {showWarnings && count.budget && count.budget.percentUsed > 0 && (
        <span className="opacity-75">
          ({count.budget.percentUsed.toFixed(1)}% of budget)
        </span>
      )}

      {error && (
        <span className="text-red-500 opacity-75" title={error}>
          (estimated)
        </span>
      )}
    </div>
  );
}

/**
 * Simplified token meter for basic use cases
 */
export function SimpleTokenMeter({
  text,
  model = 'gpt-4o-mini',
}: {
  text: string;
  model?: string;
}) {
  return (
    <TokenMeter
      model={model}
      text={text}
      showCost={false}
      showWarnings={false}
      className="text-gray-500"
    />
  );
}

/**
 * Token meter with budget enforcement for critical operations
 */
export function TokenMeterWithEnforcement({
  text,
  model,
  onBlock,
}: {
  text: string;
  model: string;
  onBlock?: () => void;
}) {
  return (
    <TokenMeter
      model={model}
      text={text}
      showCost={true}
      showWarnings={true}
      onBudgetChange={(status) => {
        if (status === 'block' && onBlock) {
          onBlock();
        }
      }}
    />
  );
}
