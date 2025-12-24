/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { composeStories } from '@storybook/react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DesignSystemProvider } from '@/theme/DesignSystemProvider'

import * as buttonStories from './stories/Button.stories'
import * as feedbackStories from './stories/Feedback.stories'
import * as tabsStories from './stories/Tabs.stories'

const composed = {
  ...composeStories(buttonStories),
  ...composeStories(tabsStories),
  ...composeStories(feedbackStories),
}

describe('design system snapshots', () => {
  Object.entries(composed).forEach(([storyName, Story]) => {
    it(`matches snapshot: ${storyName}`, () => {
      const { asFragment } = render(
        <DesignSystemProvider enableTokens>
          <Story />
        </DesignSystemProvider>
      )

      expect(asFragment()).toMatchSnapshot()
    })
  })
})
