const mongoose = require('mongoose');

/**
 * Transport modes supported for supply chain logistics.
 */
const TRANSPORT_MODES = ['Road', 'Rail', 'Sea', 'Air', 'Multimodal'];

/**
 * Valid operational shipment statuses.
 */
const SHIPMENT_STATUSES = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];

/**
 * Emission factors in kg CO2e per tonne-km aligned with GHG Protocol & DEFRA:
 * - Air: 0.5 kg CO2e/tonne-km
 * - Road: 0.1 kg CO2e/tonne-km
 * - Multimodal: 0.08 kg CO2e/tonne-km
 * - Rail: 0.03 kg CO2e/tonne-km
 * - Sea: 0.015 kg CO2e/tonne-km
 */
const EMISSION_FACTORS = {
  Air: 0.5,
  Road: 0.1,
  Multimodal: 0.08,
  Rail: 0.03,
  Sea: 0.015
};

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: [true, 'Shipment ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor reference is required']
    },
    origin: {
      city: {
        type: String,
        required: [true, 'Origin city is required'],
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Origin country is required'],
        trim: true
      },
      coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 }
      }
    },
    destination: {
      city: {
        type: String,
        required: [true, 'Destination city is required'],
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Destination country is required'],
        trim: true
      },
      coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 }
      }
    },
    transportMode: {
      type: String,
      required: [true, 'Transport mode is required'],
      enum: {
        values: TRANSPORT_MODES,
        message: '{VALUE} is not a valid transport mode'
      }
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required in kilometers'],
      min: [0, 'Distance cannot be negative']
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required in kilograms'],
      min: [0, 'Weight cannot be negative']
    },
    cost: {
      type: Number,
      min: [0, 'Cost must be non-negative']
    },
    carbonEmission: {
      type: Number,
      min: [0, 'Carbon emission must be non-negative']
    },
    status: {
      type: String,
      enum: {
        values: SHIPMENT_STATUSES,
        message: '{VALUE} is not a valid shipment status'
      },
      default: 'Pending'
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required']
    },
    arrivalDate: {
      type: Date
    },
    isRefrigerated: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * Pre-save hook: Auto-calculates carbonEmission if not already provided.
 *
 * Formula:
 * carbonEmission = (weight / 1000) * distance * emissionFactor * (isRefrigerated ? 1.2 : 1)
 *
 * Guard condition:
 * Only calculates if carbonEmission is null/undefined or falsy.
 * This preserves manually entered/measured telemetry values while providing
 * automatic estimation for new shipment bookings.
 */
shipmentSchema.pre('save', function (next) {
  if (this.carbonEmission === undefined || this.carbonEmission === null) {
    const factor = EMISSION_FACTORS[this.transportMode] || 0.1;
    const refrigerationMultiplier = this.isRefrigerated ? 1.2 : 1.0;
    const weightInTonnes = this.weight / 1000;
    const calculatedEmission = weightInTonnes * this.distance * factor * refrigerationMultiplier;

    // Round to 2 decimal places
    this.carbonEmission = Math.round(calculatedEmission * 100) / 100;
  }
  next();
});

// Compound and single-field indexes for query performance (Q27)
shipmentSchema.index({ vendor: 1, departureDate: -1 });
shipmentSchema.index({ transportMode: 1 });
shipmentSchema.index({ status: 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);

module.exports = Shipment;
module.exports.TRANSPORT_MODES = TRANSPORT_MODES;
module.exports.SHIPMENT_STATUSES = SHIPMENT_STATUSES;
module.exports.EMISSION_FACTORS = EMISSION_FACTORS;
