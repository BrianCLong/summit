export interface BaseRequest {
  requestId: string;
  timestamp: string;
}

export interface BaseResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface VersionedDTO {
  version: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
