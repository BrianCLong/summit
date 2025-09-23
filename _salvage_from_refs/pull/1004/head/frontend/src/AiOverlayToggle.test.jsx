import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from './store'
import AiOverlayToggle from './AiOverlayToggle'
import { describe, it, expect } from 'vitest'

describe('AiOverlayToggle', () => {
  it('renders consistently', () => {
    const { container } = render(
      <Provider store={store}>
        <AiOverlayToggle />
      </Provider>
    )
    expect(container).toMatchSnapshot()
  })
})
