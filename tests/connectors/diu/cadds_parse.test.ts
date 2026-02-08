import { readFileSync } from 'fs'
import { join } from 'path'
import { parseCadds } from '../../../src/connectors/diu/cadds_parse'

describe('parseCadds', () => {
  const fixturePath = join(__dirname, '../../fixtures/diu/cadds.html')
  const missingDuePath = join(
    __dirname,
    '../../fixtures/diu/cadds_missing_due.html',
  )

  it('extracts structured solicitation fields with citations', () => {
    const html = readFileSync(fixturePath, 'utf-8')
    const result = parseCadds({
      url: 'https://www.diu.mil/work-with-us/submit-solution/PROJ00637',
      html,
    })

    expect(result.response_due_at).toBe('2026-02-18T04:59:59.000Z')
    expect(result.problem_statement).toContain('containerized system')
    expect(result.desired_attributes.length).toBeGreaterThanOrEqual(10)
    expect(result.constraints.length).toBeGreaterThan(0)
    expect(result.interop.length).toBeGreaterThan(0)
    expect(result.compliance.length).toBeGreaterThan(0)

    const citedFields = new Set(result.citations.map((c) => c.field))
    expect(citedFields).toEqual(
      expect.arrayContaining([
        'response_due_at',
        'problem_statement',
        'desired_attributes',
        'constraints',
        'interop',
        'compliance',
      ]),
    )
  })

  it('handles missing response due date', () => {
    const html = readFileSync(missingDuePath, 'utf-8')
    const result = parseCadds({
      url: 'https://www.diu.mil/work-with-us/submit-solution/PROJ00637',
      html,
    })

    expect(result.response_due_at).toBeUndefined()
    const citedFields = new Set(result.citations.map((c) => c.field))
    expect(citedFields.has('response_due_at')).toBe(false)
  })
})
