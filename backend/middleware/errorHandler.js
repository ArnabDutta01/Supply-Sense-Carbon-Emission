/**
 * Centralized Error Handling Middleware for Express.
 *
 * Normalizes different error types (Mongoose Validation, CastError, MongoDB duplicate keys,
 * custom operational errors, unhandled exceptions) into consistent JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  // Log error for server-side diagnosis
  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // 1. Mongoose Bad ObjectId / CastError (400)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found: invalid value '${err.value}' for field '${err.path}'`;
  }

  // 2. MongoDB Duplicate Key Error (code 11000 -> 409)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedFields = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    const duplicatedValues = err.keyValue ? Object.values(err.keyValue).join(', ') : '';
    message = `Duplicate field value entered: [${duplicatedFields}: ${duplicatedValues}]. Value must be unique.`;
  }

  // 3. Mongoose Schema Validation Error (400)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = Object.values(err.errors).map((val) => val.message);
    message = validationErrors.join('; ');
  }

  // 4. Response formatting
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      rawError: err
    })
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
