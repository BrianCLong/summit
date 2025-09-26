import { OnboardingProgressRepo } from '../../repos/OnboardingProgressRepo.ts';
import type { OnboardingStepStatus } from '../../repos/OnboardingProgressRepo.ts';

const repo = new OnboardingProgressRepo();

export const onboardingResolvers = {
  Query: {
    onboardingProgress: async (_: unknown, args: { userId?: string }, ctx: any) => {
      const userId = args?.userId || ctx?.user?.id || ctx?.req?.user?.id;
      if (!userId) {
        throw new Error('User ID is required to fetch onboarding progress');
      }

      return await repo.getProgress(userId);
    },
  },
  Mutation: {
    upsertOnboardingStep: async (
      _: unknown,
      args: { input: { userId?: string; stepKey: string; status?: OnboardingStepStatus; completed: boolean; data?: any } },
      ctx: any,
    ) => {
      const { input } = args;
      const userId = input?.userId || ctx?.user?.id || ctx?.req?.user?.id;
      if (!userId) {
        throw new Error('User ID is required to update onboarding progress');
      }

      return await repo.upsertStep({
        userId,
        stepKey: input.stepKey,
        status: input.status,
        completed: input.completed,
        data: input.data ?? null,
      });
    },
    resetOnboardingProgress: async (_: unknown, args: { userId?: string }, ctx: any) => {
      const userId = args?.userId || ctx?.user?.id || ctx?.req?.user?.id;
      if (!userId) {
        throw new Error('User ID is required to reset onboarding progress');
      }

      await repo.reset(userId);
      return true;
    },
  },
};

export default onboardingResolvers;
