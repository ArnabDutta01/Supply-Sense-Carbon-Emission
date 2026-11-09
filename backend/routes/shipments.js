const express = require('express');
const router = express.Router();
const Shipment = require('../models/Shipment');
const Vendor = require('../models/Vendor');
const { validateShipment } = require('../utils/validators');

/**
 * @route   GET /api/shipments
 * @desc    Get all shipments with filtering (vendor, status, transportMode, date range) and pagination
 * @access  Protected (API Key)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      vendor,
      status,
      transportMode,
      startDate,
      endDate,
      sortBy = 'departureDate',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // Filters
    if (vendor) filter.vendor = vendor;
    if (status) filter.status = status;
    if (transportMode) filter.transportMode = transportMode;

    // Date range filter on departureDate
    if (startDate || endDate) {
      filter.departureDate = {};
      if (startDate) {
        filter.departureDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.departureDate.$lte = new Date(endDate);
      }
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {
      [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1
    };

    const [shipments, totalCount] = await Promise.all([
      Shipment.find(filter)
        .populate('vendor', 'name industry tier riskLevel')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Shipment.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      count: shipments.length,
      totalCount,
      totalPages,
      page: pageNum,
      limit: limitNum,
      data: shipments
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/shipments/analytics/overview
 * @desc    Shipment carbon analytics: totals, mode breakdowns, monthly emission trends
 * @access  Protected (API Key)
 * NOTE: Must be defined before /:id route to prevent route collision.
 */
router.get('/analytics/overview', async (req, res, next) => {
  try {
    const [totalCount, totalsResult, transportModeBreakdown, monthlyTrends, statusBreakdown] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.aggregate([
        {
          $group: {
            _id: null,
            totalCarbon: { $sum: '$carbonEmission' },
            avgCarbon: { $avg: '$carbonEmission' },
            totalDistance: { $sum: '$distance' },
            totalWeight: { $sum: '$weight' },
            totalCost: { $sum: '$cost' }
          }
        }
      ]),
      Shipment.aggregate([
        {
          $group: {
            _id: '$transportMode',
            shipmentCount: { $sum: 1 },
            totalCarbon: { $sum: '$carbonEmission' },
            avgCarbon: { $avg: '$carbonEmission' },
            totalDistance: { $sum: '$distance' },
            totalWeight: { $sum: '$weight' }
          }
        },
        { $sort: { totalCarbon: -1 } }
      ]),
      Shipment.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$departureDate' } },
            shipmentCount: { $sum: 1 },
            totalCarbon: { $sum: '$carbonEmission' },
            avgCarbon: { $avg: '$carbonEmission' },
            totalDistance: { $sum: '$distance' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Shipment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const summary = totalsResult[0] || {
      totalCarbon: 0,
      avgCarbon: 0,
      totalDistance: 0,
      totalWeight: 0,
      totalCost: 0
    };

    res.json({
      success: true,
      data: {
        totalShipments: totalCount,
        totalCarbon: Math.round(summary.totalCarbon * 100) / 100,
        avgCarbonPerShipment: Math.round(summary.avgCarbon * 100) / 100,
        totalDistanceKm: Math.round(summary.totalDistance * 10) / 10,
        totalWeightKg: Math.round(summary.totalWeight * 10) / 10,
        totalCost: Math.round(summary.totalCost * 100) / 100,
        transportModeBreakdown: transportModeBreakdown.map((item) => ({
          transportMode: item._id,
          shipmentCount: item.shipmentCount,
          totalCarbon: Math.round(item.totalCarbon * 100) / 100,
          avgCarbon: Math.round(item.avgCarbon * 100) / 100,
          totalDistance: Math.round(item.totalDistance * 10) / 10
        })),
        monthlyTrends: monthlyTrends.map((trend) => ({
          month: trend._id,
          shipmentCount: trend.shipmentCount,
          totalCarbon: Math.round(trend.totalCarbon * 100) / 100,
          avgCarbon: Math.round(trend.avgCarbon * 100) / 100,
          totalDistance: Math.round(trend.totalDistance * 10) / 10
        })),
        statusBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/shipments/:id
 * @desc    Get single shipment by ID with populated vendor details
 * @access  Protected (API Key)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id).populate('vendor');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: `Shipment with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/shipments
 * @desc    Create a new shipment (auto-calculates carbonEmission via pre-save hook)
 * @access  Protected (API Key)
 */
router.post('/', async (req, res, next) => {
  try {
    const validation = validateShipment(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Verify vendor exists
    const vendorExists = await Vendor.findById(req.body.vendor);
    if (!vendorExists) {
      return res.status(404).json({
        success: false,
        message: `Referenced vendor with ID '${req.body.vendor}' does not exist`
      });
    }

    // Create and save to trigger pre-save hook for carbon calculation
    const shipment = new Shipment(req.body);
    await shipment.save();

    await shipment.populate('vendor', 'name industry tier riskLevel');

    res.status(201).json({
      success: true,
      data: shipment
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/shipments/:id
 * @desc    Update an existing shipment
 * @access  Protected (API Key)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: `Shipment with ID '${req.params.id}' not found`
      });
    }

    // If client does not explicitly provide carbonEmission and parameters influencing emission are modified,
    // clear carbonEmission so the pre-save hook recalculates it based on updated values.
    const affectsCarbon =
      req.body.weight !== undefined ||
      req.body.distance !== undefined ||
      req.body.transportMode !== undefined ||
      req.body.isRefrigerated !== undefined;

    if (req.body.carbonEmission === undefined && affectsCarbon) {
      shipment.carbonEmission = undefined;
    }

    Object.assign(shipment, req.body);
    await shipment.save();

    await shipment.populate('vendor', 'name industry tier riskLevel');

    res.json({
      success: true,
      data: shipment
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/shipments/:id
 * @desc    Delete a shipment
 * @access  Protected (API Key)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: `Shipment with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      message: `Shipment '${shipment.shipmentId}' deleted successfully`,
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
