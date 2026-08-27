export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    ...(message ? { message } : {}),
    data
  };
}

export function errorResponse(message: string, statusCode = 400) {
  const error: any = new Error(message);
  error.statusCode = statusCode;
  return error;
}
