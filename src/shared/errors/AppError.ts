export class AppError extends Error {
  statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    // Maintains proper stack trace for where our error was thrown (only on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export default AppError;
