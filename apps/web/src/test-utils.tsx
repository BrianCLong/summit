import React from 'react'
import { render } from '@testing-library/react'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

const mockStore = configureStore({
  reducer: {},
})

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider store={mockStore}>
      <TooltipProvider>{children}</TooltipProvider>
    </Provider>
  )
}

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }
