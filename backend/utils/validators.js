const { VENDOR_INDUSTRIES, RISK_LEVELS, VENDOR_TIERS } = require('../models/Vendor');
const { TRANSPORT_MODES, SHIPMENT_STATUSES } = require('../models/Shipment');
const { EMISSION_SCOPES, EMISSION_CATEGORIES, VERIFICATION_STATUSES, DATA_QUALITY_TIERS } = require('../models/Emission');

/**
 * Helper to check if a value is a non-empty string.
 */
const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;

/**
 * Helper to check if a value is a valid numeric date or date string.
 */
const isValidDate = (val) => {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
};

/**
 * Helper to check if a value is a valid email.
 */
const isValidEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return typeof email === 'string' && emailRegex.test(email);
};

/**
 * Validates vendor creation/update payload.
 *
 * @param {Object} data - Vendor data
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validateVendor = (data) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  // Required: name
  if (!isNonEmptyString(data.name)) {
    errors.push('Vendor name is required and cannot be empty');
  }

  // Required: industry
  if (!data.industry) {
    errors.push('Industry is required');
  } else if (!VENDOR_INDUSTRIES.includes(data.industry)) {
    errors.push(`Industry must be one of: ${VENDOR_INDUSTRIES.join(', ')}`);
  }

  // Required: location & location.country
  if (!data.location || typeof data.location !== 'object') {
    errors.push('Location object is required');
  } else {
    if (!isNonEmptyString(data.location.country)) {
      errors.push('Location country is required');
    }
    if (data.location.coordinates) {
      const { lat, lng } = data.location.coordinates;
      if (lat !== undefined && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
        errors.push('Coordinates latitude must be a number between -90 and 90');
      }
      if (lng !== undefined && (typeof lng !== 'number' || lng < -180 || lng > 180)) {
        errors.push('Coordinates longitude must be a number between -180 and 180');
      }
    }
  }

  // Required: tier
  if (!data.tier) {
    errors.push('Tier is required');
  } else if (!VENDOR_TIERS.includes(data.tier)) {
    errors.push(`Tier must be one of: ${VENDOR_TIERS.join(', ')}`);
  }

  // Optional: sustainabilityScore
  if (data.sustainabilityScore !== undefined) {
    if (typeof data.sustainabilityScore !== 'number' || data.sustainabilityScore < 0 || data.sustainabilityScore > 100) {
      errors.push('Sustainability score must be a number between 0 and 100');
    }
  }

  // Optional: riskLevel
  if (data.riskLevel !== undefined && !RISK_LEVELS.includes(data.riskLevel)) {
    errors.push(`Risk level must be one of: ${RISK_LEVELS.join(', ')}`);
  }

  // Optional: contactEmail
  if (data.contactEmail !== undefined && !isValidEmail(data.contactEmail)) {
    errors.push('Contact email format is invalid');
  }

  // Optional: annualRevenue
  if (data.annualRevenue !== undefined && (typeof data.annualRevenue !== 'number' || data.annualRevenue < 0)) {
    errors.push('Annual revenue must be a non-negative number');
  }

  // Optional: employeeCount
  if (data.employeeCount !== undefined && (!Number.isInteger(data.employeeCount) || data.employeeCount < 0)) {
    errors.push('Employee count must be a non-negative integer');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates shipment creation payload.
 *
 * @param {Object} data - Shipment data
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validateShipment = (data) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  // Required: shipmentId
  if (!isNonEmptyString(data.shipmentId)) {
    errors.push('Shipment ID is required');
  }

  // Required: vendor
  if (!data.vendor) {
    errors.push('Vendor ID reference is required');
  }

  // Required: origin
  if (!data.origin || typeof data.origin !== 'object') {
    errors.push('Origin object is required');
  } else {
    if (!isNonEmptyString(data.origin.city)) {
      errors.push('Origin city is required');
    }
    if (!isNonEmptyString(data.origin.country)) {
      errors.push('Origin country is required');
    }
  }

  // Required: destination
  if (!data.destination || typeof data.destination !== 'object') {
    errors.push('Destination object is required');
  } else {
    if (!isNonEmptyString(data.destination.city)) {
      errors.push('Destination city is required');
    }
    if (!isNonEmptyString(data.destination.country)) {
      errors.push('Destination country is required');
    }
  }

  // Required: transportMode
  if (!data.transportMode) {
    errors.push('Transport mode is required');
  } else if (!TRANSPORT_MODES.includes(data.transportMode)) {
    errors.push(`Transport mode must be one of: ${TRANSPORT_MODES.join(', ')}`);
  }

  // Required: distance
  if (data.distance === undefined || typeof data.distance !== 'number' || data.distance < 0) {
    errors.push('Distance is required and must be a non-negative number (in km)');
  }

  // Required: weight
  if (data.weight === undefined || typeof data.weight !== 'number' || data.weight < 0) {
    errors.push('Weight is required and must be a non-negative number (in kg)');
  }

  // Optional: cost
  if (data.cost !== undefined && (typeof data.cost !== 'number' || data.cost < 0)) {
    errors.push('Cost must be a non-negative number');
  }

  // Optional: carbonEmission
  if (data.carbonEmission !== undefined && (typeof data.carbonEmission !== 'number' || data.carbonEmission < 0)) {
    errors.push('Carbon emission must be a non-negative number');
  }

  // Optional: status
  if (data.status !== undefined && !SHIPMENT_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${SHIPMENT_STATUSES.join(', ')}`);
  }

  // Required: departureDate
  if (!isValidDate(data.departureDate)) {
    errors.push('Departure date is required and must be a valid date');
  }

  // Optional: arrivalDate (must be after departureDate if provided)
  if (data.arrivalDate !== undefined && data.arrivalDate !== null) {
    if (!isValidDate(data.arrivalDate)) {
      errors.push('Arrival date must be a valid date');
    } else if (isValidDate(data.departureDate)) {
      const dep = new Date(data.departureDate);
      const arr = new Date(data.arrivalDate);
      if (arr < dep) {
        errors.push('Arrival date cannot be earlier than departure date');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates carbon emission record payload.
 *
 * @param {Object} data - Emission data
 * @returns {{ isValid: boolean, errors: string[] }}
 */
const validateEmission = (data) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  // Required: vendor
  if (!data.vendor) {
    errors.push('Vendor ID reference is required');
  }

  // Required: scope
  if (!data.scope) {
    errors.push('Scope is required');
  } else if (!EMISSION_SCOPES.includes(data.scope)) {
    errors.push(`Scope must be one of: ${EMISSION_SCOPES.join(', ')}`);
  }

  // Required: category
  if (!data.category) {
    errors.push('Category is required');
  } else if (!EMISSION_CATEGORIES.includes(data.category)) {
    errors.push(`Category must be one of: ${EMISSION_CATEGORIES.join(', ')}`);
  }

  // Required: amount
  if (data.amount === undefined || typeof data.amount !== 'number' || data.amount < 0) {
    errors.push('Amount is required and must be a non-negative number (kg CO2e)');
  }

  // Required: reportingPeriod { startDate, endDate }
  if (!data.reportingPeriod || typeof data.reportingPeriod !== 'object') {
    errors.push('Reporting period object is required');
  } else {
    const hasValidStart = isValidDate(data.reportingPeriod.startDate);
    const hasValidEnd = isValidDate(data.reportingPeriod.endDate);

    if (!hasValidStart) {
      errors.push('Reporting period start date is required and must be a valid date');
    }
    if (!hasValidEnd) {
      errors.push('Reporting period end date is required and must be a valid date');
    }

    if (hasValidStart && hasValidEnd) {
      const start = new Date(data.reportingPeriod.startDate);
      const end = new Date(data.reportingPeriod.endDate);
      if (end < start) {
        errors.push('Reporting period end date cannot be earlier than start date');
      }
    }
  }

  // Optional: verificationStatus
  if (data.verificationStatus !== undefined && !VERIFICATION_STATUSES.includes(data.verificationStatus)) {
    errors.push(`Verification status must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
  }

  // Optional: dataQuality
  if (data.dataQuality !== undefined && !DATA_QUALITY_TIERS.includes(data.dataQuality)) {
    errors.push(`Data quality must be one of: ${DATA_QUALITY_TIERS.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateVendor,
  validateShipment,
  validateEmission
};
