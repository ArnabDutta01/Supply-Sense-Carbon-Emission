const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const Shipment = require('../models/Shipment');
const Emission = require('../models/Emission');
const { validateVendor } = require('../utils/validators');

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors with filtering, text search, sorting, and pagination
 * @access  Protected (API Key)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      industry,
      riskLevel,
      tier,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // Exact match filters
    if (industry) filter.industry = industry;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (tier) filter.tier = tier;

    // Case-insensitive substring search on vendor name
    if (search && search.trim() !== '') {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Sort order
    const sort = {
      [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1
    };

    const [vendors, totalCount] = await Promise.all([
      Vendor.find(filter).sort(sort).skip(skip).limit(limitNum),
      Vendor.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      count: vendors.length,
      totalCount,
      totalPages,
      page: pageNum,
      limit: limitNum,
      data: vendors
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/vendors/stats/overview
 * @desc    Get aggregated vendor statistics (total, score averages, risk and tier breakdown)
 * @access  Protected (API Key)
 * NOTE: Must be defined before /:id route to prevent route collision.
 */
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [totalVendors, scoreStats, riskDistribution, tierDistribution, industryDistribution] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.aggregate([
        {
          $group: {
            _id: null,
            avgSustainabilityScore: { $avg: '$sustainabilityScore' },
            minSustainabilityScore: { $min: '$sustainabilityScore' },
            maxSustainabilityScore: { $max: '$sustainabilityScore' }
          }
        }
      ]),
      Vendor.aggregate([
        {
          $group: {
            _id: '$riskLevel',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Vendor.aggregate([
        {
          $group: {
            _id: '$tier',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Vendor.aggregate([
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const avgScore = scoreStats.length > 0 && scoreStats[0].avgSustainabilityScore !== null
      ? Math.round(scoreStats[0].avgSustainabilityScore * 10) / 10
      : 0;

    res.json({
      success: true,
      data: {
        totalVendors,
        avgSustainabilityScore: avgScore,
        scoreRange: {
          min: scoreStats[0]?.minSustainabilityScore ?? 0,
          max: scoreStats[0]?.maxSustainabilityScore ?? 0
        },
        riskDistribution,
        tierDistribution,
        industryDistribution
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/vendors/:id
 * @desc    Get single vendor by ID with populated shipments and emissions
 * @access  Protected (API Key)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('shipments')
      .populate('emissions');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: `Vendor with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/vendors
 * @desc    Create a new vendor
 * @access  Protected (API Key)
 */
router.post('/', async (req, res, next) => {
  try {
    const validation = validateVendor(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const vendor = await Vendor.create(req.body);

    res.status(201).json({
      success: true,
      data: vendor
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/vendors/:id
 * @desc    Update an existing vendor
 * @access  Protected (API Key)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: `Vendor with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      data: vendor
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/vendors/:id
 * @desc    Delete vendor and cascade delete related shipments and emissions
 * @access  Protected (API Key)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: `Vendor with ID '${req.params.id}' not found`
      });
    }

    // Cascade delete related records to preserve referential integrity
    const [deletedShipments, deletedEmissions] = await Promise.all([
      Shipment.deleteMany({ vendor: req.params.id }),
      Emission.deleteMany({ vendor: req.params.id })
    ]);

    res.json({
      success: true,
      message: `Vendor '${vendor.name}' and related records deleted successfully`,
      cascadeSummary: {
        shipmentsDeleted: deletedShipments.deletedCount,
        emissionsDeleted: deletedEmissions.deletedCount
      },
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
