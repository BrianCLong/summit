/**
 * LLM preflight middleware for token budget enforcement
 * Guards against excessive token usage before API calls
 */

import { Request, Response, NextFunction } from 'express';
import {
  countTokens,
  getModelFamily,
  validateTokenBudget,
  ModelFamily,
} from '../lib/tokcount';
import logger from '../utils/logger';

interface LLMRequest extends Request {
  body: {
    provider?: string;
    model: string;
    prompt: string;
    completion?: string;
    _tokcount?: {
      total: number;
      truncated: boolean;
      estimatedCostUSD?: number;
      budgetStatus: 'proceed' | 'warn' | 'block';
    };
  };
}

/**
 * Middleware to enforce token budgets before LLM API calls
 */
export async function enforceTokenBudget(
  req: LLMRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { provider, model, prompt, completion } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields for token counting',
        required: ['model', 'prompt'],
      });
    }

    const inferredProvider = provider || getModelFamily(model);
    const tokenCount = await countTokens(
      inferredProvider as ModelFamily,
      model,
      prompt,
      completion,
    );

    const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
    const budgetCheck = validateTokenBudget(tokenCount.total, budgetLimit);

    // Add token count info to request for downstream use
    req.body._tokcount = {
      total: tokenCount.total,
      truncated: false,
      estimatedCostUSD: tokenCount.estimatedCostUSD,
      budgetStatus: budgetCheck.recommendAction,
    };

    // Handle different budget scenarios
    switch (budgetCheck.recommendAction) {
      case 'block':
        logger.warn(
          `Token budget exceeded: ${tokenCount.total} tokens (limit: ${budgetLimit})`,
          {
            model,
            tokens: tokenCount.total,
            cost: tokenCount.estimatedCostUSD,
          },
        );

        return res.status(429).json({
          error: 'Token budget exceeded',
          details: {
            tokensRequested: tokenCount.total,
            budgetLimit,
            percentUsed: budgetCheck.percentUsed,
            estimatedCostUSD: tokenCount.estimatedCostUSD,
          },
          suggestion: 'Reduce prompt length or increase budget limit',
        });

      case 'warn':
        logger.warn(
          `Token budget warning: ${tokenCount.total} tokens (${budgetCheck.percentUsed}% of limit)`,
          {
            model,
            tokens: tokenCount.total,
            cost: tokenCount.estimatedCostUSD,
          },
        );

        // Add warning headers but continue
        res.setHeader('X-Token-Budget-Warning', 'true');
        res.setHeader(
          'X-Token-Usage-Percent',
          budgetCheck.percentUsed.toString(),
        );
        break;

      case 'proceed':
        logger.debug(`Token budget check passed: ${tokenCount.total} tokens`, {
          model,
          tokens: tokenCount.total,
        });
        break;
    }

    // Set informational headers
    res.setHeader('X-Token-Count', tokenCount.total.toString());
    res.setHeader(
      'X-Estimated-Cost-USD',
      (tokenCount.estimatedCostUSD || 0).toString(),
    );

    next();
  } catch (error) {
    logger.error('Token budget enforcement error:', error);

    // Don't block requests on token counting errors, but log them
    req.body._tokcount = {
      total: 0,
      truncated: false,
      budgetStatus: 'proceed',
    };

    next();
  }
}

/**
 * Middleware to truncate prompts that exceed budget
 */
export async function truncatePromptIfNeeded(
  req: LLMRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { provider, model, prompt } = req.body;
    const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
    const maxTokens = Math.floor(budgetLimit * 0.9); // Use 90% of budget for safety

    if (!model || !prompt) {
      return next();
    }

    const inferredProvider = provider || getModelFamily(model);
    const tokenCount = await countTokens(inferredProvider as ModelFamily, model, prompt);

    if (tokenCount.total > maxTokens) {
      // Simple truncation strategy - take first portion of prompt
      const averageCharsPerToken = prompt.length / tokenCount.total;
      const maxChars = Math.floor(maxTokens * averageCharsPerToken * 0.9);

      const truncatedPrompt =
        prompt.substring(0, maxChars) +
        '\n\n[... content truncated due to token limit ...]';

      req.body.prompt = truncatedPrompt;
      req.body._tokcount = {
        total: maxTokens,
        truncated: true,
        budgetStatus: 'proceed',
      };

      logger.warn(
        `Prompt truncated: ${tokenCount.total} -> ${maxTokens} tokens`,
        {
          model,
          originalTokens: tokenCount.total,
          truncatedTokens: maxTokens,
        },
      );
    }

    next();
  } catch (error) {
    logger.error('Prompt truncation error:', error);
    next();
  }
}

/**
 * Enhanced middleware with cost tracking per user/tenant
 */
export async function enforceTokenBudgetWithTracking(
  req: LLMRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    // Extract user/tenant info from auth context
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    const { provider, model, prompt, completion } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields for token counting',
      });
    }

    const inferredProvider = provider || getModelFamily(model);
    const tokenCount = await countTokens(
      inferredProvider as ModelFamily,
      model,
      prompt,
      completion,
    );

    // TODO: Implement usage tracking per user/tenant
    // This would integrate with a usage tracking service
    // const usage = await trackTokenUsage(userId, tenantId, tokenCount);

    const budgetLimit = Number(process.env.TOKEN_BUDGET_LIMIT || 120000);
    const budgetCheck = validateTokenBudget(tokenCount.total, budgetLimit);

    req.body._tokcount = {
      total: tokenCount.total,
      truncated: false,
      estimatedCostUSD: tokenCount.estimatedCostUSD,
      budgetStatus: budgetCheck.recommendAction,
    };

    if (budgetCheck.recommendAction === 'block') {
      return res.status(429).json({
        error: 'Token budget exceeded',
        details: {
          tokensRequested: tokenCount.total,
          budgetLimit,
          percentUsed: budgetCheck.percentUsed,
          estimatedCostUSD: tokenCount.estimatedCostUSD,
          userId,
          tenantId,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Enhanced token budget enforcement error:', error);
    next();
  }
}
