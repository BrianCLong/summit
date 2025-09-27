// =============================================
// File: apps/web/src/components/maestro/RoutingStudio.stories.tsx
// =============================================
import type { Meta, StoryObj } from '@storybook/react';
import RoutingStudio from './RoutingStudio';

const meta: Meta<typeof RoutingStudio> = { title: 'Maestro/RoutingStudio', component: RoutingStudio };
export default meta;
export const Default: StoryObj<typeof RoutingStudio> = { args: {} };
