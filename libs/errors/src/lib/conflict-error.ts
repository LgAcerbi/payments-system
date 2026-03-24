import { AppError } from './app-error.js';
import { ErrorType } from './error-type.js';

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorType.CONFLICT);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
