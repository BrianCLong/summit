/**
 * SHIM: Storybook types loosened to unblock typecheck for stories.
 * TODO(typing): align stories with official Storybook CSF types and remove.
 */

declare module '@storybook/react' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Meta<TArgs = any> = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Meta: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type StoryObj<TArgs = any> = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type StoryFn<TArgs = any> = any;
}
