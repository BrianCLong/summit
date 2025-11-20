// =============================================
// Accessibility Tests for UI Components
// =============================================
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table'

describe('Accessibility Tests - UI Components', () => {
  describe('Button Component', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible name when icon-only', async () => {
      const { container } = render(
        <Button aria-label="Close dialog">
          <span>×</span>
        </Button>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should be keyboard accessible', () => {
      const { getByRole } = render(<Button>Submit</Button>)
      const button = getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Table Component', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper table headers with scope', () => {
      const { getAllByRole } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      const headers = getAllByRole('columnheader')
      headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col')
      })
    })
  })
})
