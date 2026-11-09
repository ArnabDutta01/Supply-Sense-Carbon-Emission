const mongoose = require('mongoose');

/**
 * Valid industries for vendors in the supply chain ecosystem.
 */
const VENDOR_INDUSTRIES = [
  'Manufacturing',
  'Logistics',
  'Technology',
  'Agriculture',
  'Energy',
  'Retail',
  'Construction',
  'Textile',
  'Chemical',
  'Automotive'
];

/**
 * Valid risk levels based on sustainability scores and audit history.
 */
const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Supply chain tiers representing supplier proximity to the prime manufacturer.
 * Tier 1: Direct suppliers
 * Tier 2: Suppliers to Tier 1
 * Tier 3: Raw material/component providers
 */
const VENDOR_TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      unique: true,
      trim: true
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      enum: {
        values: VENDOR_INDUSTRIES,
        message: '{VALUE} is not a supported industry'
      }
    },
    location: {
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
      },
      region: {
        type: String,
        trim: true
      },
      coordinates: {
        lat: {
          type: Number,
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90']
        },
        lng: {
          type: Number,
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180']
        }
      }
    },
    sustainabilityScore: {
      type: Number,
      min: [0, 'Sustainability score must be between 0 and 100'],
      max: [100, 'Sustainability score must be between 0 and 100'],
      default: 50
    },
    riskLevel: {
      type: String,
      enum: {
        values: RISK_LEVELS,
        message: '{VALUE} is not a valid risk level'
      },
      default: 'Medium'
    },
    tier: {
      type: String,
      required: [true, 'Supply chain tier is required'],
      enum: {
        values: VENDOR_TIERS,
        message: '{VALUE} is not a valid vendor tier'
      }
    },
    certifications: {
      type: [String],
      default: []
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    annualRevenue: {
      type: Number,
      min: [0, 'Annual revenue must be non-negative']
    },
    employeeCount: {
      type: Number,
      min: [0, 'Employee count must be non-negative']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field linking vendor to their shipments
vendorSchema.virtual('shipments', {
  ref: 'Shipment',
  localField: '_id',
  foreignField: 'vendor'
});

// Virtual field linking vendor to their carbon emission records
vendorSchema.virtual('emissions', {
  ref: 'Emission',
  localField: '_id',
  foreignField: 'vendor'
});

// Compound index for dashboard filtering and leaderboard ranking (as noted in interview prep Q27)
vendorSchema.index({ riskLevel: 1, sustainabilityScore: -1 });

// Text index for search functionality
vendorSchema.index({ name: 'text' });

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
module.exports.VENDOR_INDUSTRIES = VENDOR_INDUSTRIES;
module.exports.RISK_LEVELS = RISK_LEVELS;
module.exports.VENDOR_TIERS = VENDOR_TIERS;
