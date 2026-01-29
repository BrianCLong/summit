import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import annotationsReducer, { getInitialAnnotationState } from './annotationsSlice'
import { AnnotationPanel } from './AnnotationPanel'

const renderWithStore = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: { annotations: annotationsReducer },
  })
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('AnnotationPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.skip('autosaves draft to localStorage and restores with prompt', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithStore(<AnnotationPanel />)

    const body = screen.getByLabelText('Annotation body')
    await user.click(body)
    await user.type(body, 'Draft note survives reload')

    await waitFor(() => {
      expect(localStorage.getItem('annotations.draft')).toContain('Draft note survives reload')
    })

    unmount()

    // Render with fresh store that picks up draft from storage
    const store = configureStore({
      reducer: { annotations: annotationsReducer },
      preloadedState: {
        annotations: getInitialAnnotationState(),
      },
    })
    render(
      <Provider store={store}>
        <AnnotationPanel />
      </Provider>
    )

    expect(screen.getByText('Restore your unsaved draft?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /restore/i }))

    expect(screen.getByLabelText('Annotation body')).toHaveValue('Draft note survives reload')
  })
})
