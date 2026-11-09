const express = require('express');
const router = express.Router();
const Emission = require('../models/Emission');
const Vendor = require('../models/Vendor');
const { validateEmission } = require('../utils/validators');

/**
 * @route   GET /api/emissions
 * @desc    Get all emission records with filtering (vendor, scope, verificationStatus, date range) and pagination
 * @access  Protected (API Key)
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      vendor,
      scope,
      verificationStatus,
      dataQuality,
      category,
      startDate,
      endDate,
      sortBy = 'reportingPeriod.startDate',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (vendor) filter.vendor = vendor;
    if (scope) filter.scope = scope;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (dataQuality) filter.dataQuality = dataQuality;
    if (category) filter.category = category;

    // Filter by date range on reportingPeriod.startDate
    if (startDate || endDate) {
      filter['reportingPeriod.startDate'] = {};
      if (startDate) {
        filter['reportingPeriod.startDate'].$gte = new Date(startDate);
      }
      if (endDate) {
        filter['reportingPeriod.startDate'].$lte = new Date(endDate);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {
      [sortBy]: sortOrder.toLowerCase() === 'asc' ? 1 : -1
    };

    const [emissions, totalCount] = await Promise.all([
      Emission.find(filter)
        .populate('vendor', 'name industry tier riskLevel sustainabilityScore')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Emission.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      count: emissions.length,
      totalCount,
      totalPages,
      page: pageNum,
      limit: limitNum,
      data: emissions
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/emissions/dashboard/overview
 * @desc    Executive emission dashboard analytics:
 *          - Total aggregated emissions (kg CO2e)
 *          - Scope breakdown (Scope 1/2/3 using $group)
 *          - Monthly emission trends (using $group)
 *          - Top 10 vendor emitters ($group + $lookup + $unwind + $sort + $limit)
 *          - Verification status distribution
 *          - Category breakdown
 * @access  Protected (API Key)
 * NOTE: Must be defined before /:id route to prevent route collision.
 */
router.get('/dashboard/overview', async (req, res, next) => {
  try {
    const [
      totalsResult,
      scopeBreakdown,
      monthlyTrends,
      topVendors,
      verificationDistribution,
      categoryBreakdown
    ] = await Promise.all([
      // 1. Total emission aggregate
      Emission.aggregate([
        {
          $group: {
            _id: null,
            totalEmissions: { $sum: '$amount' },
            avgEmissionPerRecord: { $avg: '$amount' },
            recordCount: { $sum: 1 }
          }
        }
      ]),

      // 2. Scope breakdown (Scope 1 vs Scope 2 vs Scope 3)
      Emission.aggregate([
        {
          $group: {
            _id: '$scope',
            totalEmissions: { $sum: '$amount' },
            recordCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 3. Monthly emission trend timeline
      Emission.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$reportingPeriod.startDate' } },
            totalEmissions: { $sum: '$amount' },
            recordCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 4. Top 10 vendor emitters (as specified in interview prep Q11)
      Emission.aggregate([
        {
          $group: {
            _id: '$vendor',
            totalEmissions: { $sum: '$amount' },
            records: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: '_id',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        { $unwind: '$vendorInfo' },
        { $sort: { totalEmissions: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            vendorId: '$_id',
            vendorName: '$vendorInfo.name',
            industry: '$vendorInfo.industry',
            tier: '$vendorInfo.tier',
            riskLevel: '$vendorInfo.riskLevel',
            sustainabilityScore: '$vendorInfo.sustainabilityScore',
            totalEmissions: { $round: ['$totalEmissions', 2] },
            records: 1
          }
        }
      ]),

      // 5. Verification status distribution
      Emission.aggregate([
        {
          $group: {
            _id: '$verificationStatus',
            totalEmissions: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // 6. Category breakdown across scopes
      Emission.aggregate([
        {
          $group: {
            _id: '$category',
            scope: { $first: '$scope' },
            totalEmissions: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalEmissions: -1 } }
      ])
    ]);

    const summary = totalsResult[0] || {
      totalEmissions: 0,
      avgEmissionPerRecord: 0,
      recordCount: 0
    };

    res.json({
      success: true,
      data: {
        summary: {
          totalEmissionsKgCO2e: Math.round(summary.totalEmissions * 100) / 100,
          avgEmissionPerRecordKgCO2e: Math.round(summary.avgEmissionPerRecord * 100) / 100,
          totalRecords: summary.recordCount
        },
        scopeBreakdown: scopeBreakdown.map((item) => ({
          scope: item._id,
          totalEmissions: Math.round(item.totalEmissions * 100) / 100,
          recordCount: item.recordCount
        })),
        monthlyTrends: monthlyTrends.map((trend) => ({
          month: trend._id,
          totalEmissions: Math.round(trend.totalEmissions * 100) / 100,
          recordCount: trend.recordCount
        })),
        topVendors,
        verificationDistribution: verificationDistribution.map((item) => ({
          status: item._id,
          totalEmissions: Math.round(item.totalEmissions * 100) / 100,
          count: item.count
        })),
        categoryBreakdown: categoryBreakdown.map((item) => ({
          category: item._id,
          scope: item.scope,
          totalEmissions: Math.round(item.totalEmissions * 100) / 100,
          count: item.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/emissions/:id
 * @desc    Get single emission record by ID with populated vendor details
 * @access  Protected (API Key)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const emission = await Emission.findById(req.params.id).populate('vendor');

    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `Emission record with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      data: emission
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/emissions
 * @desc    Create a new emission record
 * @access  Protected (API Key)
 */
router.post('/', async (req, res, next) => {
  try {
    const validation = validateEmission(req.body);
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

    const emission = await Emission.create(req.body);
    await emission.populate('vendor', 'name industry tier riskLevel');

    res.status(201).json({
      success: true,
      data: emission
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/emissions/:id
 * @desc    Update an existing emission record
 * @access  Protected (API Key)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const emission = await Emission.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vendor', 'name industry tier riskLevel');

    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `Emission record with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      data: emission
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/emissions/:id
 * @desc    Delete an emission record
 * @access  Protected (API Key)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const emission = await Emission.findByIdAndDelete(req.params.id);

    if (!emission) {
      return res.status(404).json({
        success: false,
        message: `Emission record with ID '${req.params.id}' not found`
      });
    }

    res.json({
      success: true,
      message: 'Emission record deleted successfully',
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
