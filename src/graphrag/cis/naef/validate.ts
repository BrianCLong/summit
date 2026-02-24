import { NAEFEventSchema } from './schema';

export function validateNAEFEvent(event: unknown): { valid: boolean; errors?: string[] } {
  const result = NAEFEventSchema.safeParse(event);
  if (!result.success) {
    // console.log('Validation failed result:', JSON.stringify(result, null, 2));
    if (!result.error) {
       console.error('Zod safeParse returned success=false but no error object');
       return { valid: false, errors: ['Unknown error'] };
    }
    // Handle case where result.error.errors might be missing (unlikely for ZodError but let's check)
    const issues = result.error.errors || result.error.issues || [];
    return {
      valid: false,
      errors: issues.map((e: any) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  return { valid: true };
}
