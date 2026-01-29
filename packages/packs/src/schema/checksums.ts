import { z } from 'zod';

export const ChecksumsSchema = z.record(z.string());

export type Checksums = z.infer<typeof ChecksumsSchema>;
