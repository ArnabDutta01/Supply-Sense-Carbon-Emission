const mongoose = require('mongoose');

/**
 * GHG Protocol Emission Scopes:
 * - Scope 1: Direct emissions from owned or controlled sources
 * - Scope 2: Indirect emissions from generation of purchased energy
 * - Scope 3: All indirect emissions (not included in scope 2) in the upstream/downstream value chain
 */
const EMISSION_SCOPES = ['Scope 1', 'Scope 2', 'Scope 3'];

/**
 * Specific emission activity categories aligned with GHG Protocol.
 */
const EMISSION_CATEGORIES = [
  // Scope 1
  'Direct Combustion',
  'Fleet Vehicles',
  'Process Emissions',
  // Scope 2
  'Purchased Electricity',
  'Purchased Heating',
  // Scope 3
  'Upstream Transportation',
  'Purchased Goods',
  'Business Travel',
  'Waste Disposal'
];

/**
 * Verification workflow statuses for sustainability audits.
 */
const VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected'];

/**
 * Data quality tiers representing empirical confidence in reported figures.
 */
const DATA_QUALITY_TIERS = ['Measured', 'Calculated', 'Estimated'];

const emissionSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required']
    },
    scope: {
      type: String,
      required: [true, 'Emission scope is required'],
      enum: {
        values: EMISSION_SCOPES,
        message: '{VALUE} is not a valid emission scope'
      }
    },
    category: {
      type: String,
      required: [true, 'Emission category is required'],
      enum: {
        values: EMISSION_CATEGORIES,
        message: '{VALUE} is not a valid emission category'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Emission amount is required in kg CO2e'],
      min: [0, 'Emission amount cannot be negative']
    },
    reportingPeriod: {
      startDate: {
        type: Date,
        required: [true, 'Reporting period start date is required']
      },
      endDate: {
        type: Date,
        required: [true, 'Reporting period end date is required']
      }
    },
    methodology: {
      type: String,
      trim: true
    },
    verificationStatus: {
      type: String,
      enum: {
        values: VERIFICATION_STATUSES,
        message: '{VALUE} is not a valid verification status'
      },
      default: 'Pending'
    },
    dataQuality: {
      type: String,
      enum: {
        values: DATA_QUALITY_TIERS,
        message: '{VALUE} is not a valid data quality tier'
      },
      default: 'Estimated'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for vendor scope-time queries (Q27)
emissionSchema.index({ vendor: 1, scope: 1, 'reportingPeriod.startDate': -1 });
emissionSchema.index({ 'reportingPeriod.startDate': 1 });
emissionSchema.index({ category: 1 });
emissionSchema.index({ verificationStatus: 1 });

const Emission = mongoose.model('Emission', emissionSchema);

module.exports = Emission;
module.exports.EMISSION_SCOPES = EMISSION_SCOPES;
module.exports.EMISSION_CATEGORIES = EMISSION_CATEGORIES;
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES;
module.exports.DATA_QUALITY_TIERS = DATA_QUALITY_TIERS;
