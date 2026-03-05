export interface ACPRequest {
  id: string
  method: string
  params: any
}

export interface ACPResponse {
  id: string
  result?: any
  error?: string
}

export async function handleACP(req: ACPRequest): Promise<ACPResponse> {
  // TODO translate ACP request → Summit runtime task
  return { id: req.id }
}
