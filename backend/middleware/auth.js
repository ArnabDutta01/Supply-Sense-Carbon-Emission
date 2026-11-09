/**
 * API Key Authentication Middleware.
 *
 * Verifies that the client supplies a valid API key in the 'X-API-Key' request header
 * matching the server's configured process.env.API_KEY.
 *
 * Security & Development behavior:
 * - If process.env.API_KEY is not defined or is an empty string, authentication is skipped
 *   (useful for local development, test suites, and initial onboarding).
 * - If defined, requests missing or presenting an incorrect key receive a 401 Unauthorized JSON response.
 */
const apiKeyAuth = (req, res, next) => {
  const configuredApiKey = process.env.API_KEY;

  // If no API_KEY configured in environment, skip authentication for local dev
  if (!configuredApiKey || configuredApiKey.trim() === '') {
    return next();
  }

  // Retrieve API key from request headers (Express req.header handles case-insensitivity)
  const incomingApiKey = req.header('X-API-Key') || req.header('x-api-key');

  if (!incomingApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing X-API-Key header'
    });
  }

  if (incomingApiKey !== configuredApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid API key'
    });
  }

  next();
};

module.exports = {
  apiKeyAuth
};
