
import { test, expect, describe, beforeEach, afterEach } from '@jest/globals';

// Globally expose test functions for tsx execution
(global as any).test = test;
(global as any).expect = expect;
(global as any).describe = describe;
(global as any).beforeEach = beforeEach;
(global as any).afterEach = afterEach;
