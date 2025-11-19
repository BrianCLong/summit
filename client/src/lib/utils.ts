import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ClassValue = Parameters<typeof clsx>[number];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
