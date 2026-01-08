// @ts-nocheck
// API client for mobile interface

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  async search(query: string) {
    return this.get<{ results: unknown[] }>(`/search?q=${encodeURIComponent(query)}`);
  },
};
