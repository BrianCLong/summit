import type { Request, Response } from 'express';
import { CitizenProfileAggregator } from '../citizen-profile-aggregator.js';
import { FormAutocomplete } from '../form-autocomplete.js';
import { ProactiveServiceResolver } from '../proactive-service-resolver.js';
import { WorkflowAutomation } from '../workflow-automation.js';
import { AutomationMetrics } from '../metrics.js';

// Singleton instances
const profileAggregator = new CitizenProfileAggregator();
const formAutocomplete = new FormAutocomplete(profileAggregator);
const proactiveResolver = new ProactiveServiceResolver(profileAggregator);
const workflow = new WorkflowAutomation(profileAggregator, formAutocomplete, proactiveResolver);
const metrics = new AutomationMetrics();

export interface GraphQLContext {
  req: Request;
  res: Response;
  services: {
    profileAggregator: CitizenProfileAggregator;
    formAutocomplete: FormAutocomplete;
    proactiveResolver: ProactiveServiceResolver;
    workflow: WorkflowAutomation;
    metrics: AutomationMetrics;
  };
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  return {
    req,
    res,
    services: {
      profileAggregator,
      formAutocomplete,
      proactiveResolver,
      workflow,
      metrics,
    },
  };
}
