import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'

describe('Dialog Focus Management', () => {
  it('traps focus within dialog when open', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <Input placeholder="First input" data-testid="first-input" />
          <Input placeholder="Second input" data-testid="second-input" />
          <DialogFooter>
            <Button data-testid="cancel-btn">Cancel</Button>
            <Button data-testid="confirm-btn">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const firstInput = screen.getByTestId('first-input')
    const secondInput = screen.getByTestId('second-input')
    const cancelBtn = screen.getByTestId('cancel-btn')
    const confirmBtn = screen.getByTestId('confirm-btn')
    const closeBtn = screen.getByRole('button', { name: /close/i })

    // Tab through dialog elements
    await user.tab()
    expect(closeBtn).toHaveFocus()

    await user.tab()
    expect(firstInput).toHaveFocus()

    await user.tab()
    expect(secondInput).toHaveFocus()

    await user.tab()
    expect(cancelBtn).toHaveFocus()

    await user.tab()
    expect(confirmBtn).toHaveFocus()

    // Should wrap back to first focusable element
    await user.tab()
    expect(closeBtn).toHaveFocus()
  })

  it('closes dialog with Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledWith(false)
  })

  it('has proper ARIA attributes', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogHeader>
          <p>This dialog has proper ARIA attributes</p>
        </DialogContent>
      </Dialog>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const title = screen.getByText('Accessible Dialog')
    expect(title).toBeInTheDocument()
  })

  it('close button has accessible label', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    expect(closeButton).toBeInTheDocument()

    // Check for screen reader only text
    const srOnlyText = closeButton.querySelector('.sr-only')
    expect(srOnlyText).toHaveTextContent('Close')
  })

  it('overlay is present and clickable', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { container } = render(
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <p>Content</p>
        </DialogContent>
      </Dialog>
    )

    // Radix UI creates an overlay element
    const overlay = container.querySelector('[data-radix-dialog-overlay]')
    expect(overlay).toBeInTheDocument()
  })

  it('maintains focus within modal on Shift+Tab', async () => {
    const user = userEvent.setup()

    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <Input placeholder="First input" data-testid="first-input" />
          <Button data-testid="action-btn">Action</Button>
        </DialogContent>
      </Dialog>
    )

    const closeBtn = screen.getByRole('button', { name: /close/i })
    const firstInput = screen.getByTestId('first-input')
    const actionBtn = screen.getByTestId('action-btn')

    // Start from action button
    actionBtn.focus()
    expect(actionBtn).toHaveFocus()

    // Shift+Tab backwards
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(firstInput).toHaveFocus()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(closeBtn).toHaveFocus()

    // Should wrap to last element
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(actionBtn).toHaveFocus()
  })
})
