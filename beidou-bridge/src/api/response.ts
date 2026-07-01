import type { ApiResponse } from "../models/types.js";

export function ok<T>(data: T, message = "success"): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  };
}

export function fail(code: number, message: string): ApiResponse {
  return {
    code,
    message,
    timestamp: Date.now(),
  };
}
