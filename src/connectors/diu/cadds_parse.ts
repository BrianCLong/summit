export type Citation = {
  field: string
  note: string
  source: 'diu-page' | 'twz-article'
}

export type Solicitation = {
  id: string
  source: 'DIU'
  title: string
  url: string
  response_due_at?: string
  problem_statement?: string
  desired_attributes: string[]
  constraints: string[]
  interop: string[]
  compliance: string[]
  citations: Citation[]
}

const INTEROP_PATTERNS = [/\bMOSA\b/i, /open systems/i, /open architecture/i]
const COMPLIANCE_PATTERNS = [/Section\s+889/i]

export function parseCadds(input: { url: string; html: string }): Solicitation {
  const text = extractVisibleText(input.html)
  const desiredAttributes = extractDesiredAttributes(input.html, text)
  const citations: Citation[] = []

  const response_due_at = extractResponseDue(text, citations)
  const problem_statement = extractProblemStatement(text, citations)

  const constraints = extractConstraints(desiredAttributes, citations)
  const interop = extractInterop(desiredAttributes, text, citations)
  const compliance = extractCompliance(text, citations)

  if (desiredAttributes.length > 0) {
    citations.push({
      field: 'desired_attributes',
      note: `Extracted ${desiredAttributes.length} desired attributes`,
      source: 'diu-page',
    })
  }

  return {
    id: 'diu:PROJ00637:cadds',
    source: 'DIU',
    title: 'Containerized Autonomous Drone Delivery System (CADDS)',
    url: input.url,
    response_due_at,
    problem_statement,
    desired_attributes: desiredAttributes,
    constraints,
    interop,
    compliance,
    citations,
  }
}

function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function extractResponseDue(text: string, citations: Citation[]): string | undefined {
  const match = text.match(
    /Responses Due By\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:\s+(\d{1,2}:\d{2}:\d{2})\s*(ET|EST|EDT))?/i,
  )

  if (!match) {
    return undefined
  }

  const datePart = match[1]
  const timePart = match[2] ?? '23:59:59'
  const tz = match[3] ?? 'ET'
  const iso = parseEasternToIso(datePart, timePart, tz)

  if (iso) {
    citations.push({
      field: 'response_due_at',
      note: match[0],
      source: 'diu-page',
    })
  }

  return iso
}

function parseEasternToIso(
  datePart: string,
  timePart: string,
  tz: string,
): string | undefined {
  const offset = tz.toUpperCase() === 'EDT' ? '-04:00' : '-05:00'
  const normalizedDate = new Date(`${datePart} ${timePart} GMT${offset}`)

  if (Number.isNaN(normalizedDate.getTime())) {
    return undefined
  }

  return normalizedDate.toISOString()
}

function extractProblemStatement(
  text: string,
  citations: Citation[],
): string | undefined {
  const sections = text.split(/Problem Statement/i)
  if (sections.length < 2) {
    return undefined
  }

  const after = sections[1]
  const endIndex = after.search(/Desired Solution Attributes|Required Capabilities/i)
  const statement = (endIndex >= 0 ? after.slice(0, endIndex) : after)
    .trim()
    .replace(/\s+/g, ' ')

  if (statement.length === 0) {
    return undefined
  }

  citations.push({
    field: 'problem_statement',
    note: statement.slice(0, 160),
    source: 'diu-page',
  })

  return statement
}

function extractDesiredAttributes(html: string, text: string): string[] {
  const listMatches = html.match(
    /Desired Solution Attributes[\s\S]*?<\/ul>/i,
  )
  if (listMatches?.[0]) {
    const listHtml = listMatches[0]
    const items = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) => match[1])
      .map((item) => extractVisibleText(item))
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (items.length > 0) {
      return items
    }
  }

  const lines = text.split('\n')
  const startIndex = lines.findIndex((line) =>
    /Desired Solution Attributes/i.test(line),
  )
  if (startIndex === -1) {
    return []
  }

  return lines
    .slice(startIndex + 1)
    .filter((line) => /^[-•\d]/.test(line.trim()))
    .map((line) => line.replace(/^[-•\d.\s]+/, '').trim())
    .filter(Boolean)
}

function extractConstraints(
  desiredAttributes: string[],
  citations: Citation[],
): string[] {
  const constraints = desiredAttributes.filter((attr) =>
    /(crew|minutes|day\/night|inclement|maritime|land|sea|air)/i.test(attr),
  )

  if (constraints.length > 0) {
    citations.push({
      field: 'constraints',
      note: constraints.slice(0, 3).join(' | '),
      source: 'diu-page',
    })
  }

  return constraints
}

function extractInterop(
  desiredAttributes: string[],
  text: string,
  citations: Citation[],
): string[] {
  const matches = desiredAttributes.filter((attr) =>
    INTEROP_PATTERNS.some((pattern) => pattern.test(attr)),
  )

  if (matches.length === 0 && INTEROP_PATTERNS.some((pattern) => pattern.test(text))) {
    matches.push('MOSA / open architecture alignment required')
  }

  if (matches.length > 0) {
    citations.push({
      field: 'interop',
      note: matches.slice(0, 2).join(' | '),
      source: 'diu-page',
    })
  }

  return matches
}

function extractCompliance(text: string, citations: Citation[]): string[] {
  const matches = COMPLIANCE_PATTERNS.filter((pattern) => pattern.test(text))

  if (matches.length === 0) {
    return []
  }

  citations.push({
    field: 'compliance',
    note: 'Section 889 mention detected',
    source: 'diu-page',
  })

  return ['Section 889 compliance mention']
}
