import {
  AdapterActionPayload,
  AdapterActionResult,
  AdaptersResponse,
  SwitchboardApiError,
} from "./types";

const API_BASE = "/api/switchboard";

async function parseError(response: Response): Promise<SwitchboardApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    body = undefined;
  }

  const error = new Error(
    (body as { message?: string })?.message ?? `Request failed with status ${response.status}`
  ) as SwitchboardApiError;

  error.status =
    typeof (body as { status?: number })?.status === "number"
      ? (body as { status: number }).status
      : response.status;

  const policyErrors =
    (body as { policyErrors?: string[]; policy?: string[] })?.policyErrors ??
    (body as { policy?: string[] })?.policy;
  const verificationErrors =
    (body as { verificationErrors?: string[]; verification?: string[] })?.verificationErrors ??
    (body as { verification?: string[] })?.verification;

  if (policyErrors) {
    error.policyErrors = policyErrors;
  }

  if (verificationErrors) {
    error.verificationErrors = verificationErrors;
  }

  return error;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export function fetchAdapters(): Promise<AdaptersResponse> {
  return request<AdaptersResponse>("/adapters");
}

export function performAdapterAction(
  adapterId: string,
  action: "install" | "enable" | "disable" | "uninstall" | "verify",
  payload?: AdapterActionPayload
): Promise<AdapterActionResult> {
  return request<AdapterActionResult>(`/adapters/${adapterId}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}
