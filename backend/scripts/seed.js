const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Vendor = require('../models/Vendor');
const Shipment = require('../models/Shipment');
const Emission = require('../models/Emission');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplysense';

/**
 * 10 Diverse Vendors covering all 10 industries, tiers 1-3, and varied ESG risk profiles.
 */
const vendorsData = [
  {
    name: 'EcoSteel Global GmbH',
    industry: 'Manufacturing',
    location: {
      country: 'Germany',
      region: 'North Rhine-Westphalia',
      coordinates: { lat: 51.4332, lng: 6.7623 }
    },
    sustainabilityScore: 84,
    riskLevel: 'Low',
    tier: 'Tier 1',
    certifications: ['ISO 14001', 'ISO 50001', 'ResponsibleSteel'],
    contactEmail: 'sustainability@ecosteel-global.de',
    annualRevenue: 420000000,
    employeeCount: 3500
  },
  {
    name: 'TransLogix International Logistics',
    industry: 'Logistics',
    location: {
      country: 'United States',
      region: 'Illinois',
      coordinates: { lat: 41.8781, lng: -87.6298 }
    },
    sustainabilityScore: 68,
    riskLevel: 'Medium',
    tier: 'Tier 1',
    certifications: ['EPA SmartWay Partner', 'ISO 14001'],
    contactEmail: 'esg@translogix-logistics.com',
    annualRevenue: 780000000,
    employeeCount: 5200
  },
  {
    name: 'NovaChip Semiconductor Corp',
    industry: 'Technology',
    location: {
      country: 'Taiwan',
      region: 'Hsinchu Science Park',
      coordinates: { lat: 24.7816, lng: 120.9974 }
    },
    sustainabilityScore: 91,
    riskLevel: 'Low',
    tier: 'Tier 2',
    certifications: ['ISO 14001', 'RE100 Signatory', 'CDP A-List'],
    contactEmail: 'green@novachip-semi.tw',
    annualRevenue: 1250000000,
    employeeCount: 8400
  },
  {
    name: 'AgriGreen Biomass & Commodities',
    industry: 'Agriculture',
    location: {
      country: 'Brazil',
      region: 'Mato Grosso',
      coordinates: { lat: -15.6014, lng: -56.0979 }
    },
    sustainabilityScore: 77,
    riskLevel: 'Low',
    tier: 'Tier 3',
    certifications: ['Roundtable on Responsible Soy (RTRS)', 'Rainforest Alliance'],
    contactEmail: 'compliance@agrigreen-bio.br',
    annualRevenue: 95000000,
    employeeCount: 1100
  },
  {
    name: 'Helios Clean Energy Solutions',
    industry: 'Energy',
    location: {
      country: 'Spain',
      region: 'Andalusia',
      coordinates: { lat: 37.3891, lng: -5.9845 }
    },
    sustainabilityScore: 89,
    riskLevel: 'Low',
    tier: 'Tier 2',
    certifications: ['ISO 14001', 'B Corp Certified', 'EU Ecolabel'],
    contactEmail: 'contact@helios-cleanenergy.es',
    annualRevenue: 180000000,
    employeeCount: 950
  },
  {
    name: 'Apex Consumer Goods Group',
    industry: 'Retail',
    location: {
      country: 'United Kingdom',
      region: 'Greater London',
      coordinates: { lat: 51.5074, lng: -0.1278 }
    },
    sustainabilityScore: 59,
    riskLevel: 'Medium',
    tier: 'Tier 1',
    certifications: ['FSC Certified', 'Fair Trade Certified'],
    contactEmail: 'procurement@apex-goods.co.uk',
    annualRevenue: 540000000,
    employeeCount: 4200
  },
  {
    name: 'BuildMax Infrastructure Ltd',
    industry: 'Construction',
    location: {
      country: 'India',
      region: 'Maharashtra',
      coordinates: { lat: 19.076, lng: 72.8777 }
    },
    sustainabilityScore: 42,
    riskLevel: 'High',
    tier: 'Tier 2',
    certifications: ['ISO 9001'],
    contactEmail: 'operations@buildmax-infra.in',
    annualRevenue: 260000000,
    employeeCount: 6800
  },
  {
    name: 'SilkRoute Fashion Mills',
    industry: 'Textile',
    location: {
      country: 'Vietnam',
      region: 'Ho Chi Minh City',
      coordinates: { lat: 10.8231, lng: 106.6297 }
    },
    sustainabilityScore: 36,
    riskLevel: 'Critical',
    tier: 'Tier 3',
    certifications: ['OEKO-TEX Standard 100'],
    contactEmail: 'audit@silkroute-mills.vn',
    annualRevenue: 62000000,
    employeeCount: 2900
  },
  {
    name: 'SynthChem Polymer Solutions',
    industry: 'Chemical',
    location: {
      country: 'United States',
      region: 'Texas',
      coordinates: { lat: 29.7604, lng: -95.3698 }
    },
    sustainabilityScore: 48,
    riskLevel: 'High',
    tier: 'Tier 2',
    certifications: ['Responsible Care'],
    contactEmail: 'regulatory@synthchem-poly.com',
    annualRevenue: 670000000,
    employeeCount: 3100
  },
  {
    name: 'AeroDrive Propulsion Systems',
    industry: 'Automotive',
    location: {
      country: 'South Korea',
      region: 'Ulsan',
      coordinates: { lat: 35.5384, lng: 129.3114 }
    },
    sustainabilityScore: 73,
    riskLevel: 'Medium',
    tier: 'Tier 1',
    certifications: ['ISO 14001', 'IATF 16949'],
    contactEmail: 'sustainability@aerodrive-auto.kr',
    annualRevenue: 890000000,
    employeeCount: 4600
  }
];

/**
 * Generates a date in the past between 1 and 180 days ago (spanning ~6 months).
 */
const getPastDate = (daysAgo, hourOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() + hourOffset);
  return date;
};

/**
 * 30 realistic shipments across vendors with all 5 transport modes and varied statuses.
 */
const buildShipmentsData = (vendors) => [
  // 1. Air Freight - High urgent electronics
  {
    shipmentId: 'SHP-2026-001',
    vendor: vendors[2]._id, // NovaChip (Technology)
    origin: { city: 'Taipei', country: 'Taiwan', coordinates: { lat: 25.033, lng: 121.5654 } },
    destination: { city: 'Frankfurt', country: 'Germany', coordinates: { lat: 50.1109, lng: 8.6821 } },
    transportMode: 'Air',
    distance: 9350,
    weight: 2400,
    cost: 18500,
    status: 'Delivered',
    departureDate: getPastDate(170),
    arrivalDate: getPastDate(168),
    isRefrigerated: false
  },
  // 2. Sea Freight - Heavy raw commodities
  {
    shipmentId: 'SHP-2026-002',
    vendor: vendors[3]._id, // AgriGreen (Agriculture)
    origin: { city: 'Santos', country: 'Brazil', coordinates: { lat: -23.9618, lng: -46.3322 } },
    destination: { city: 'Rotterdam', country: 'Netherlands', coordinates: { lat: 51.9244, lng: 4.4777 } },
    transportMode: 'Sea',
    distance: 9800,
    weight: 48000,
    cost: 32000,
    status: 'Delivered',
    departureDate: getPastDate(160),
    arrivalDate: getPastDate(142),
    isRefrigerated: true
  },
  // 3. Rail Freight - European steel transport
  {
    shipmentId: 'SHP-2026-003',
    vendor: vendors[0]._id, // EcoSteel (Manufacturing)
    origin: { city: 'Duisburg', country: 'Germany', coordinates: { lat: 51.4344, lng: 6.7623 } },
    destination: { city: 'Milan', country: 'Italy', coordinates: { lat: 45.4642, lng: 9.19 } },
    transportMode: 'Rail',
    distance: 820,
    weight: 28000,
    cost: 7200,
    status: 'Delivered',
    departureDate: getPastDate(155),
    arrivalDate: getPastDate(153),
    isRefrigerated: false
  },
  // 4. Road Freight - US Midwest distribution
  {
    shipmentId: 'SHP-2026-004',
    vendor: vendors[1]._id, // TransLogix (Logistics)
    origin: { city: 'Chicago', country: 'United States', coordinates: { lat: 41.8781, lng: -87.6298 } },
    destination: { city: 'Detroit', country: 'United States', coordinates: { lat: 42.3314, lng: -83.0458 } },
    transportMode: 'Road',
    distance: 455,
    weight: 12000,
    cost: 2100,
    status: 'Delivered',
    departureDate: getPastDate(150),
    arrivalDate: getPastDate(149),
    isRefrigerated: false
  },
  // 5. Multimodal - Automotive components
  {
    shipmentId: 'SHP-2026-005',
    vendor: vendors[9]._id, // AeroDrive (Automotive)
    origin: { city: 'Ulsan', country: 'South Korea', coordinates: { lat: 35.5384, lng: 129.3114 } },
    destination: { city: 'Prague', country: 'Czech Republic', coordinates: { lat: 50.0755, lng: 14.4378 } },
    transportMode: 'Multimodal',
    distance: 8900,
    weight: 16500,
    cost: 24000,
    status: 'Delivered',
    departureDate: getPastDate(145),
    arrivalDate: getPastDate(128),
    isRefrigerated: false
  },
  // 6. Sea Freight - Textile fabrics
  {
    shipmentId: 'SHP-2026-006',
    vendor: vendors[7]._id, // SilkRoute (Textile)
    origin: { city: 'Ho Chi Minh City', country: 'Vietnam', coordinates: { lat: 10.8231, lng: 106.6297 } },
    destination: { city: 'Southampton', country: 'United Kingdom', coordinates: { lat: 50.9097, lng: -1.4044 } },
    transportMode: 'Sea',
    distance: 11500,
    weight: 22000,
    cost: 16800,
    status: 'Delivered',
    departureDate: getPastDate(140),
    arrivalDate: getPastDate(115),
    isRefrigerated: false
  },
  // 7. Road Freight - Chemical polymers with refrigerated cooling
  {
    shipmentId: 'SHP-2026-007',
    vendor: vendors[8]._id, // SynthChem (Chemical)
    origin: { city: 'Houston', country: 'United States', coordinates: { lat: 29.7604, lng: -95.3698 } },
    destination: { city: 'Dallas', country: 'United States', coordinates: { lat: 32.7767, lng: -96.797 } },
    transportMode: 'Road',
    distance: 385,
    weight: 18000,
    cost: 3400,
    status: 'Delivered',
    departureDate: getPastDate(135),
    arrivalDate: getPastDate(134),
    isRefrigerated: true
  },
  // 8. Road Freight - Construction aggregates
  {
    shipmentId: 'SHP-2026-008',
    vendor: vendors[6]._id, // BuildMax (Construction)
    origin: { city: 'Mumbai', country: 'India', coordinates: { lat: 19.076, lng: 72.8777 } },
    destination: { city: 'Pune', country: 'India', coordinates: { lat: 18.5204, lng: 73.8567 } },
    transportMode: 'Road',
    distance: 150,
    weight: 35000,
    cost: 1200,
    status: 'Delivered',
    departureDate: getPastDate(130),
    arrivalDate: getPastDate(129),
    isRefrigerated: false
  },
  // 9. Air Freight - Critical solar inverter modules
  {
    shipmentId: 'SHP-2026-009',
    vendor: vendors[4]._id, // Helios (Energy)
    origin: { city: 'Seville', country: 'Spain', coordinates: { lat: 37.3891, lng: -5.9845 } },
    destination: { city: 'Munich', country: 'Germany', coordinates: { lat: 48.1351, lng: 11.582 } },
    transportMode: 'Air',
    distance: 1850,
    weight: 3200,
    cost: 8900,
    status: 'Delivered',
    departureDate: getPastDate(125),
    arrivalDate: getPastDate(124),
    isRefrigerated: false
  },
  // 10. Road Freight - UK Retail distribution
  {
    shipmentId: 'SHP-2026-010',
    vendor: vendors[5]._id, // Apex Consumer (Retail)
    origin: { city: 'London', country: 'United Kingdom', coordinates: { lat: 51.5074, lng: -0.1278 } },
    destination: { city: 'Manchester', country: 'United Kingdom', coordinates: { lat: 53.4808, lng: -2.2426 } },
    transportMode: 'Road',
    distance: 335,
    weight: 8500,
    cost: 1450,
    status: 'Delivered',
    departureDate: getPastDate(120),
    arrivalDate: getPastDate(119),
    isRefrigerated: false
  },
  // 11. Sea Freight - Bulk steel coils
  {
    shipmentId: 'SHP-2026-011',
    vendor: vendors[0]._id, // EcoSteel
    origin: { city: 'Antwerp', country: 'Belgium', coordinates: { lat: 51.2194, lng: 4.4025 } },
    destination: { city: 'New York', country: 'United States', coordinates: { lat: 40.7128, lng: -74.006 } },
    transportMode: 'Sea',
    distance: 5900,
    weight: 42000,
    cost: 28000,
    status: 'Delivered',
    departureDate: getPastDate(115),
    arrivalDate: getPastDate(100),
    isRefrigerated: false
  },
  // 12. Rail Freight - Grain & soy meal
  {
    shipmentId: 'SHP-2026-012',
    vendor: vendors[3]._id, // AgriGreen
    origin: { city: 'Cuiabá', country: 'Brazil', coordinates: { lat: -15.6014, lng: -56.0979 } },
    destination: { city: 'Rondonópolis', country: 'Brazil', coordinates: { lat: -16.4674, lng: -54.636 } },
    transportMode: 'Rail',
    distance: 215,
    weight: 50000,
    cost: 3800,
    status: 'Delivered',
    departureDate: getPastDate(110),
    arrivalDate: getPastDate(109),
    isRefrigerated: false
  },
  // 13. Air Freight - High value semiconductor wafers (Measured Override!)
  {
    shipmentId: 'SHP-2026-013',
    vendor: vendors[2]._id, // NovaChip
    origin: { city: 'Taipei', country: 'Taiwan', coordinates: { lat: 25.033, lng: 121.5654 } },
    destination: { city: 'San Jose', country: 'United States', coordinates: { lat: 37.3382, lng: -121.8863 } },
    transportMode: 'Air',
    distance: 10400,
    weight: 1800,
    cost: 21500,
    // Explicit measured override to showcase pre-save hook guard logic
    carbonEmission: 9120.45,
    status: 'Delivered',
    departureDate: getPastDate(105),
    arrivalDate: getPastDate(104),
    isRefrigerated: true
  },
  // 14. Road Freight - Automotive wiring harnesses
  {
    shipmentId: 'SHP-2026-014',
    vendor: vendors[9]._id, // AeroDrive
    origin: { city: 'Seoul', country: 'South Korea', coordinates: { lat: 37.5665, lng: 126.978 } },
    destination: { city: 'Busan', country: 'South Korea', coordinates: { lat: 35.1796, lng: 129.0756 } },
    transportMode: 'Road',
    distance: 390,
    weight: 9500,
    cost: 1600,
    status: 'Delivered',
    departureDate: getPastDate(100),
    arrivalDate: getPastDate(99),
    isRefrigerated: false
  },
  // 15. Multimodal - Polymer additives
  {
    shipmentId: 'SHP-2026-015',
    vendor: vendors[8]._id, // SynthChem
    origin: { city: 'Houston', country: 'United States', coordinates: { lat: 29.7604, lng: -95.3698 } },
    destination: { city: 'Veracruz', country: 'Mexico', coordinates: { lat: 19.1738, lng: -96.1342 } },
    transportMode: 'Multimodal',
    distance: 1420,
    weight: 24000,
    cost: 11200,
    status: 'Delivered',
    departureDate: getPastDate(95),
    arrivalDate: getPastDate(91),
    isRefrigerated: false
  },
  // 16. Road Freight - Logistics freight lane
  {
    shipmentId: 'SHP-2026-016',
    vendor: vendors[1]._id, // TransLogix
    origin: { city: 'Atlanta', country: 'United States', coordinates: { lat: 33.749, lng: -84.388 } },
    destination: { city: 'Miami', country: 'United States', coordinates: { lat: 25.7617, lng: -80.1918 } },
    transportMode: 'Road',
    distance: 1060,
    weight: 14000,
    cost: 3900,
    status: 'Delivered',
    departureDate: getPastDate(90),
    arrivalDate: getPastDate(88),
    isRefrigerated: true
  },
  // 17. Air Freight - Retail samples
  {
    shipmentId: 'SHP-2026-017',
    vendor: vendors[5]._id, // Apex Consumer
    origin: { city: 'London', country: 'United Kingdom', coordinates: { lat: 51.5074, lng: -0.1278 } },
    destination: { city: 'Dubai', country: 'United Arab Emirates', coordinates: { lat: 25.2048, lng: 55.2708 } },
    transportMode: 'Air',
    distance: 5470,
    weight: 1100,
    cost: 9400,
    status: 'Delivered',
    departureDate: getPastDate(85),
    arrivalDate: getPastDate(84),
    isRefrigerated: false
  },
  // 18. Sea Freight - Bulk construction cement
  {
    shipmentId: 'SHP-2026-018',
    vendor: vendors[6]._id, // BuildMax
    origin: { city: 'Mundra', country: 'India', coordinates: { lat: 22.8396, lng: 69.7259 } },
    destination: { city: 'Colombo', country: 'Sri Lanka', coordinates: { lat: 6.9271, lng: 79.8612 } },
    transportMode: 'Sea',
    distance: 2200,
    weight: 38000,
    cost: 14200,
    status: 'Delivered',
    departureDate: getPastDate(80),
    arrivalDate: getPastDate(74),
    isRefrigerated: false
  },
  // 19. Rail Freight - Central European solar equipment
  {
    shipmentId: 'SHP-2026-019',
    vendor: vendors[4]._id, // Helios
    origin: { city: 'Madrid', country: 'Spain', coordinates: { lat: 40.4168, lng: -3.7038 } },
    destination: { city: 'Lyon', country: 'France', coordinates: { lat: 45.764, lng: 4.8357 } },
    transportMode: 'Rail',
    distance: 1080,
    weight: 19000,
    cost: 6500,
    status: 'Delivered',
    departureDate: getPastDate(75),
    arrivalDate: getPastDate(73),
    isRefrigerated: false
  },
  // 20. Road Freight - European steel beams
  {
    shipmentId: 'SHP-2026-020',
    vendor: vendors[0]._id, // EcoSteel
    origin: { city: 'Essen', country: 'Germany', coordinates: { lat: 51.4556, lng: 7.0116 } },
    destination: { city: 'Stuttgart', country: 'Germany', coordinates: { lat: 48.7758, lng: 9.1829 } },
    transportMode: 'Road',
    distance: 410,
    weight: 26000,
    cost: 3200,
    status: 'Delivered',
    departureDate: getPastDate(70),
    arrivalDate: getPastDate(69),
    isRefrigerated: false
  },
  // 21. Sea Freight - Asian consumer garment export
  {
    shipmentId: 'SHP-2026-021',
    vendor: vendors[7]._id, // SilkRoute
    origin: { city: 'Hai Phong', country: 'Vietnam', coordinates: { lat: 20.8449, lng: 106.6881 } },
    destination: { city: 'Los Angeles', country: 'United States', coordinates: { lat: 34.0522, lng: -118.2437 } },
    transportMode: 'Sea',
    distance: 12100,
    weight: 31000,
    cost: 22400,
    status: 'Delivered',
    departureDate: getPastDate(65),
    arrivalDate: getPastDate(42),
    isRefrigerated: false
  },
  // 22. Air Freight - High tech sensor components
  {
    shipmentId: 'SHP-2026-022',
    vendor: vendors[2]._id, // NovaChip
    origin: { city: 'Taipei', country: 'Taiwan', coordinates: { lat: 25.033, lng: 121.5654 } },
    destination: { city: 'Tokyo', country: 'Japan', coordinates: { lat: 35.6762, lng: 139.6503 } },
    transportMode: 'Air',
    distance: 2180,
    weight: 1500,
    cost: 7200,
    status: 'Delivered',
    departureDate: getPastDate(55),
    arrivalDate: getPastDate(54),
    isRefrigerated: false
  },
  // 23. Road Freight - Agricultural organic perishables
  {
    shipmentId: 'SHP-2026-023',
    vendor: vendors[3]._id, // AgriGreen
    origin: { city: 'Campinas', country: 'Brazil', coordinates: { lat: -22.9099, lng: -47.0626 } },
    destination: { city: 'São Paulo', country: 'Brazil', coordinates: { lat: -23.5505, lng: -46.6333 } },
    transportMode: 'Road',
    distance: 98,
    weight: 15000,
    cost: 1100,
    status: 'Delivered',
    departureDate: getPastDate(45),
    arrivalDate: getPastDate(44),
    isRefrigerated: true
  },
  // 24. Sea Freight - Chemical specialty drums
  {
    shipmentId: 'SHP-2026-024',
    vendor: vendors[8]._id, // SynthChem
    origin: { city: 'Galveston', country: 'United States', coordinates: { lat: 29.3013, lng: -94.7977 } },
    destination: { city: 'Singapore', country: 'Singapore', coordinates: { lat: 1.3521, lng: 103.8198 } },
    transportMode: 'Sea',
    distance: 16800,
    weight: 34000,
    cost: 38500,
    status: 'In Transit',
    departureDate: getPastDate(30),
    arrivalDate: getPastDate(-10),
    isRefrigerated: true
  },
  // 25. Multimodal - Automotive powertrain units
  {
    shipmentId: 'SHP-2026-025',
    vendor: vendors[9]._id, // AeroDrive
    origin: { city: 'Busan', country: 'South Korea', coordinates: { lat: 35.1796, lng: 129.0756 } },
    destination: { city: 'Detroit', country: 'United States', coordinates: { lat: 42.3314, lng: -83.0458 } },
    transportMode: 'Multimodal',
    distance: 11200,
    weight: 21000,
    cost: 29800,
    status: 'In Transit',
    departureDate: getPastDate(20),
    arrivalDate: getPastDate(-2),
    isRefrigerated: false
  },
  // 26. Road Freight - Construction structural rebar
  {
    shipmentId: 'SHP-2026-026',
    vendor: vendors[6]._id, // BuildMax
    origin: { city: 'Nagpur', country: 'India', coordinates: { lat: 21.1458, lng: 79.0882 } },
    destination: { city: 'Hyderabad', country: 'India', coordinates: { lat: 17.385, lng: 78.4867 } },
    transportMode: 'Road',
    distance: 502,
    weight: 28000,
    cost: 2900,
    status: 'In Transit',
    departureDate: getPastDate(5),
    arrivalDate: getPastDate(-1),
    isRefrigerated: false
  },
  // 27. Air Freight - Urgent spare solar parts (Measured override!)
  {
    shipmentId: 'SHP-2026-027',
    vendor: vendors[4]._id, // Helios
    origin: { city: 'Seville', country: 'Spain', coordinates: { lat: 37.3891, lng: -5.9845 } },
    destination: { city: 'Casablanca', country: 'Morocco', coordinates: { lat: 33.5731, lng: -7.5898 } },
    transportMode: 'Air',
    distance: 640,
    weight: 950,
    cost: 4100,
    carbonEmission: 304.0, // Measured
    status: 'In Transit',
    departureDate: getPastDate(2),
    arrivalDate: getPastDate(-1),
    isRefrigerated: false
  },
  // 28. Road Freight - Logistics scheduled delivery
  {
    shipmentId: 'SHP-2026-028',
    vendor: vendors[1]._id, // TransLogix
    origin: { city: 'Indianapolis', country: 'United States', coordinates: { lat: 39.7684, lng: -86.1581 } },
    destination: { city: 'Columbus', country: 'United States', coordinates: { lat: 39.9612, lng: -82.9988 } },
    transportMode: 'Road',
    distance: 280,
    weight: 11500,
    cost: 1650,
    status: 'Pending',
    departureDate: getPastDate(1),
    arrivalDate: getPastDate(-2),
    isRefrigerated: false
  },
  // 29. Rail Freight - Retail goods bulk consolidation
  {
    shipmentId: 'SHP-2026-029',
    vendor: vendors[5]._id, // Apex Consumer
    origin: { city: 'Felixstowe', country: 'United Kingdom', coordinates: { lat: 51.9639, lng: 1.3511 } },
    destination: { city: 'Birmingham', country: 'United Kingdom', coordinates: { lat: 52.4862, lng: -1.8904 } },
    transportMode: 'Rail',
    distance: 245,
    weight: 22000,
    cost: 3100,
    status: 'Pending',
    departureDate: getPastDate(0),
    arrivalDate: getPastDate(-3),
    isRefrigerated: false
  },
  // 30. Sea Freight - Cancelled route due to storm disruption
  {
    shipmentId: 'SHP-2026-030',
    vendor: vendors[0]._id, // EcoSteel
    origin: { city: 'Hamburg', country: 'Germany', coordinates: { lat: 53.5511, lng: 9.9937 } },
    destination: { city: 'Gdansk', country: 'Poland', coordinates: { lat: 54.352, lng: 18.6466 } },
    transportMode: 'Sea',
    distance: 720,
    weight: 15000,
    cost: 5800,
    status: 'Cancelled',
    departureDate: getPastDate(15),
    arrivalDate: null,
    isRefrigerated: false
  }
];

/**
 * 50 emission records spanning all 3 scopes, 9 categories, 10 vendors, and past 6 months.
 */
const buildEmissionsData = (vendors) => [
  // --- Scope 1 (Direct Combustion, Fleet Vehicles, Process Emissions) ---
  {
    vendor: vendors[0]._id, // EcoSteel
    scope: 'Scope 1',
    category: 'Process Emissions',
    amount: 142500,
    reportingPeriod: { startDate: getPastDate(180), endDate: getPastDate(150) },
    methodology: 'Direct blast furnace stack gas analysis (CEMS)',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Primary blast furnace production at Duisburg works'
  },
  {
    vendor: vendors[0]._id,
    scope: 'Scope 1',
    category: 'Direct Combustion',
    amount: 68400,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Natural gas meter volume x lower heating value',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Reheating furnace combustion fuel'
  },
  {
    vendor: vendors[0]._id,
    scope: 'Scope 1',
    category: 'Process Emissions',
    amount: 138900,
    reportingPeriod: { startDate: getPastDate(120), endDate: getPastDate(90) },
    methodology: 'Direct blast furnace stack gas analysis (CEMS)',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Monthly blast furnace continuous monitoring'
  },
  {
    vendor: vendors[1]._id, // TransLogix
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 94200,
    reportingPeriod: { startDate: getPastDate(175), endDate: getPastDate(145) },
    methodology: 'Fleet telematics fuel logbooks x DEFRA diesel factor',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Class 8 heavy duty long-haul diesel tractors'
  },
  {
    vendor: vendors[1]._id,
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 88750,
    reportingPeriod: { startDate: getPastDate(145), endDate: getPastDate(115) },
    methodology: 'Fleet telematics fuel logbooks x DEFRA diesel factor',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Midwest hub regional delivery fleet consumption'
  },
  {
    vendor: vendors[1]._id,
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 91300,
    reportingPeriod: { startDate: getPastDate(115), endDate: getPastDate(85) },
    methodology: 'Fleet telematics fuel logbooks',
    verificationStatus: 'Pending',
    dataQuality: 'Calculated',
    notes: 'Quarterly fleet diesel reconciliation'
  },
  {
    vendor: vendors[6]._id, // BuildMax
    scope: 'Scope 1',
    category: 'Direct Combustion',
    amount: 112000,
    reportingPeriod: { startDate: getPastDate(180), endDate: getPastDate(150) },
    methodology: 'Fuel invoices for on-site diesel generator sets',
    verificationStatus: 'Pending',
    dataQuality: 'Calculated',
    notes: 'Highway construction project generator banks'
  },
  {
    vendor: vendors[6]._id,
    scope: 'Scope 1',
    category: 'Process Emissions',
    amount: 89000,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Concrete batch plant calcination mass balance',
    verificationStatus: 'Rejected',
    dataQuality: 'Estimated',
    notes: 'Rejected by auditor due to missing clinker ratio documentation'
  },
  {
    vendor: vendors[8]._id, // SynthChem
    scope: 'Scope 1',
    category: 'Process Emissions',
    amount: 124000,
    reportingPeriod: { startDate: getPastDate(170), endDate: getPastDate(140) },
    methodology: 'Catalytic cracking reaction stoichiometry and CEMS',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Polymer synthesis unit reaction vent emissions'
  },
  {
    vendor: vendors[8]._id,
    scope: 'Scope 1',
    category: 'Direct Combustion',
    amount: 76500,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'Natural gas pipeline metering',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Steam boiler plant for heat-integrated reaction reactors'
  },
  {
    vendor: vendors[9]._id, // AeroDrive
    scope: 'Scope 1',
    category: 'Process Emissions',
    amount: 45600,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Paint shop thermal oxidizer continuous emission monitoring',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Automotive primer & topcoat drying thermal oxidizer'
  },
  {
    vendor: vendors[9]._id,
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 18200,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Fuel card transaction logs',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Plant yard hostlers and internal logistics trucks'
  },
  {
    vendor: vendors[3]._id, // AgriGreen
    scope: 'Scope 1',
    category: 'Direct Combustion',
    amount: 52400,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Tractor diesel tank dispensing telemetry',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Combine harvesters and field tractor fleet'
  },
  {
    vendor: vendors[7]._id, // SilkRoute
    scope: 'Scope 1',
    category: 'Direct Combustion',
    amount: 67300,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Coal boiler fuel mass logs',
    verificationStatus: 'Pending',
    dataQuality: 'Estimated',
    notes: 'Steam generation for fabric dyeing vats'
  },
  {
    vendor: vendors[5]._id, // Apex Consumer
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 23100,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'Fleet telematics telematics unit',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Last-mile urban delivery vans'
  },
  {
    vendor: vendors[4]._id, // Helios
    scope: 'Scope 1',
    category: 'Fleet Vehicles',
    amount: 8400,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Service vehicle fuel records',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Solar field maintenance technicians light trucks'
  },

  // --- Scope 2 (Purchased Electricity, Purchased Heating) ---
  {
    vendor: vendors[2]._id, // NovaChip
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 198000,
    reportingPeriod: { startDate: getPastDate(180), endDate: getPastDate(150) },
    methodology: 'Cleanroom sub-metered kWh x Taiwan power grid emission factor',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: '300mm wafer cleanroom HVAC and ultra-pure water recirc'
  },
  {
    vendor: vendors[2]._id,
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 184500,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Cleanroom sub-metered kWh x Taiwan grid factor minus PPA solar credits',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Cleanroom operations with 20% on-site solar PPA offset'
  },
  {
    vendor: vendors[2]._id,
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 179200,
    reportingPeriod: { startDate: getPastDate(120), endDate: getPastDate(90) },
    methodology: 'Utility bill smart meter data',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Monthly utility billing statement verification'
  },
  {
    vendor: vendors[0]._id, // EcoSteel
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 88000,
    reportingPeriod: { startDate: getPastDate(170), endDate: getPastDate(140) },
    methodology: 'Grid utility billing x German residual grid mix',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Electric Arc Furnace auxiliary electricity'
  },
  {
    vendor: vendors[0]._id,
    scope: 'Scope 2',
    category: 'Purchased Heating',
    amount: 14200,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'District steam meter readings',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Municipal district heating connection'
  },
  {
    vendor: vendors[1]._id, // TransLogix
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 32500,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Hub facility electricity billing statements',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Cross-dock sorting conveyor automation and warehouse lighting'
  },
  {
    vendor: vendors[5]._id, // Apex Consumer
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 41200,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'UK National Grid half-hourly settlement meters',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Distribution center refrigeration units and warehouse automation'
  },
  {
    vendor: vendors[5]._id,
    scope: 'Scope 2',
    category: 'Purchased Heating',
    amount: 9800,
    reportingPeriod: { startDate: getPastDate(120), endDate: getPastDate(90) },
    methodology: 'Heat meter enthalpy measurements',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Warehouse space heating during late winter'
  },
  {
    vendor: vendors[6]._id, // BuildMax
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 54000,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'State distribution company utility meter',
    verificationStatus: 'Pending',
    dataQuality: 'Calculated',
    notes: 'Prefabrication yard overhead cranes and batching towers'
  },
  {
    vendor: vendors[7]._id, // SilkRoute
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 72000,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'EVN utility bill monthly summary',
    verificationStatus: 'Pending',
    dataQuality: 'Estimated',
    notes: 'Spinning frames and weaving loom electric drives'
  },
  {
    vendor: vendors[8]._id, // SynthChem
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 89500,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'ERCOT grid factor x revenue-grade meters',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Continuous compounding extruders and centrifugal pumps'
  },
  {
    vendor: vendors[9]._id, // AeroDrive
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 62000,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'KEPCO industrial high-voltage meter data',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Robotic assembly welding cells and CNC machining centres'
  },
  {
    vendor: vendors[4]._id, // Helios
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 5600,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Substation auxiliary power meters',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Low parasitic auxiliary power for solar tracking controls'
  },
  {
    vendor: vendors[3]._id, // AgriGreen
    scope: 'Scope 2',
    category: 'Purchased Electricity',
    amount: 18900,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Rural electrification cooperative bills',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Grain drying silos aeration blowers'
  },

  // --- Scope 3 (Upstream Transport, Purchased Goods, Business Travel, Waste Disposal) ---
  {
    vendor: vendors[0]._id, // EcoSteel
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 215000,
    reportingPeriod: { startDate: getPastDate(180), endDate: getPastDate(150) },
    methodology: 'Supplier EPDs (Environmental Product Declarations) for iron ore pellets',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Upstream iron ore mining and pelletizing carbon intensity'
  },
  {
    vendor: vendors[0]._id,
    scope: 'Scope 3',
    category: 'Upstream Transportation',
    amount: 45000,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'GLEC framework multimodal tonne-km calculation',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Barge and rail transport of metallurgical coal from Rotterdam'
  },
  {
    vendor: vendors[1]._id, // TransLogix
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 38000,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Lifecycle embodied carbon of purchased commercial trailers',
    verificationStatus: 'Pending',
    dataQuality: 'Estimated',
    notes: 'Procurement of 40 dry-van trailers'
  },
  {
    vendor: vendors[1]._id,
    scope: 'Scope 3',
    category: 'Upstream Transportation',
    amount: 52000,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Subcontracted third-party carrier freight logs',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Peak overflow brokered freight loads'
  },
  {
    vendor: vendors[2]._id, // NovaChip
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 88000,
    reportingPeriod: { startDate: getPastDate(170), endDate: getPastDate(140) },
    methodology: 'Primary supplier greenhouse gas disclosures for polysilicon wafers',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Upstream hyper-pure semiconductor silicon ingot manufacturing'
  },
  {
    vendor: vendors[2]._id,
    scope: 'Scope 3',
    category: 'Business Travel',
    amount: 14500,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'Corporate travel management platform carbon tracker (ICAO methodology)',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Commercial flights for executive technical symposiums and fab audits'
  },
  {
    vendor: vendors[2]._id,
    scope: 'Scope 3',
    category: 'Waste Disposal',
    amount: 11200,
    reportingPeriod: { startDate: getPastDate(110), endDate: getPastDate(80) },
    methodology: 'Hazardous waste manifest weights x treatment emission factors',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Spent chemical solvent high-temperature incineration'
  },
  {
    vendor: vendors[3]._id, // AgriGreen
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 98000,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Nitrogen fertilizer application volume x IFA emission factors',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Embodied synthetic nitrogen and potash fertilizer manufacturing'
  },
  {
    vendor: vendors[3]._id,
    scope: 'Scope 3',
    category: 'Upstream Transportation',
    amount: 34000,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Truck freight telemetry to railhead',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Field to rail elevator transport'
  },
  {
    vendor: vendors[5]._id, // Apex Consumer
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 165000,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Spend-based EEIO (Environmentally Extended Input-Output) modelling',
    verificationStatus: 'Verified',
    dataQuality: 'Estimated',
    notes: 'Embodied carbon of retail packaging and raw ingredients'
  },
  {
    vendor: vendors[5]._id,
    scope: 'Scope 3',
    category: 'Waste Disposal',
    amount: 18500,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Landfill weight tickets x DEFRA waste disposal factors',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'Warehouse pallet recycling and packaging refuse diversion'
  },
  {
    vendor: vendors[6]._id, // BuildMax
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 245000,
    reportingPeriod: { startDate: getPastDate(170), endDate: getPastDate(140) },
    methodology: 'Cement supplier mill test reports',
    verificationStatus: 'Pending',
    dataQuality: 'Estimated',
    notes: 'Ordinary Portland Cement purchases for infrastructure piling'
  },
  {
    vendor: vendors[6]._id,
    scope: 'Scope 3',
    category: 'Upstream Transportation',
    amount: 68000,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'Tipper truck distance and tonnage logs',
    verificationStatus: 'Rejected',
    dataQuality: 'Estimated',
    notes: 'Rejected due to duplicate log sheets between quarry subcontracts'
  },
  {
    vendor: vendors[7]._id, // SilkRoute
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 115000,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Raw cotton crop lifecycle assessments (Higg Index)',
    verificationStatus: 'Pending',
    dataQuality: 'Estimated',
    notes: 'Cultivation and ginning carbon footprint of imported organic cotton'
  },
  {
    vendor: vendors[7]._id,
    scope: 'Scope 3',
    category: 'Waste Disposal',
    amount: 16000,
    reportingPeriod: { startDate: getPastDate(120), endDate: getPastDate(90) },
    methodology: 'Textile scrap recycling volume records',
    verificationStatus: 'Pending',
    dataQuality: 'Calculated',
    notes: 'Fabric cutting room scraps sent for mechanical fiber reclamation'
  },
  {
    vendor: vendors[8]._id, // SynthChem
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 188000,
    reportingPeriod: { startDate: getPastDate(160), endDate: getPastDate(130) },
    methodology: 'Feedstock ethylene pipeline contracts EPDs',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Petrochemical refinery monomer feedstocks'
  },
  {
    vendor: vendors[8]._id,
    scope: 'Scope 3',
    category: 'Upstream Transportation',
    amount: 42000,
    reportingPeriod: { startDate: getPastDate(130), endDate: getPastDate(100) },
    methodology: 'Rail tank car freight manifests',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Inbound chemical catalyst deliveries via specialized rail'
  },
  {
    vendor: vendors[9]._id, // AeroDrive
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 172000,
    reportingPeriod: { startDate: getPastDate(150), endDate: getPastDate(120) },
    methodology: 'Tier 2 supplier carbon disclosures and IMDS declarations',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Aluminum die casting and copper motor windings supply chain'
  },
  {
    vendor: vendors[9]._id,
    scope: 'Scope 3',
    category: 'Business Travel',
    amount: 12800,
    reportingPeriod: { startDate: getPastDate(120), endDate: getPastDate(90) },
    methodology: 'Corporate travel booking carbon accounting',
    verificationStatus: 'Verified',
    dataQuality: 'Measured',
    notes: 'International customer engineering support trips to EU and US OEMs'
  },
  {
    vendor: vendors[4]._id, // Helios
    scope: 'Scope 3',
    category: 'Purchased Goods',
    amount: 64000,
    reportingPeriod: { startDate: getPastDate(140), endDate: getPastDate(110) },
    methodology: 'PV module manufacturer cradle-to-gate LCA certifications',
    verificationStatus: 'Verified',
    dataQuality: 'Calculated',
    notes: 'Embodied carbon of Tier 1 monocrystalline bifacial photovoltaic panels'
  }
];

/**
 * Main seed execution routine.
 */
const seedDatabase = async () => {
  try {
    console.log(`[Seed] Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('[Seed] Database connection established.');

    // 1. Clean existing collections
    console.log('[Seed] Purging existing database collections...');
    const [delVendors, delShipments, delEmissions] = await Promise.all([
      Vendor.deleteMany({}),
      Shipment.deleteMany({}),
      Emission.deleteMany({})
    ]);
    console.log(`[Seed] Purged: ${delVendors.deletedCount} vendors, ${delShipments.deletedCount} shipments, ${delEmissions.deletedCount} emission records.`);

    // 2. Insert Vendors
    console.log('[Seed] Inserting 10 enterprise vendors across industries and tiers...');
    const createdVendors = await Vendor.insertMany(vendorsData);
    console.log(`[Seed] Successfully inserted ${createdVendors.length} vendors.`);

    // 3. Insert Shipments (using save/create to trigger Mongoose pre-save hook for auto-calculating emissions)
    console.log('[Seed] Building and inserting 30 realistic shipments (triggering pre-save carbon hook)...');
    const shipmentsData = buildShipmentsData(createdVendors);
    const createdShipments = [];

    for (const shipmentItem of shipmentsData) {
      const shipmentDoc = new Shipment(shipmentItem);
      await shipmentDoc.save(); // pre-save hook executes
      createdShipments.push(shipmentDoc);
    }
    console.log(`[Seed] Successfully inserted ${createdShipments.length} shipments with auto-calculated carbon metrics.`);

    // 4. Insert Emissions
    console.log('[Seed] Inserting 50 emission records across Scope 1, Scope 2, and Scope 3...');
    const emissionsData = buildEmissionsData(createdVendors);
    const createdEmissions = await Emission.insertMany(emissionsData);
    console.log(`[Seed] Successfully inserted ${createdEmissions.length} emission records.`);

    console.log('\n======================================================');
    console.log(' [SupplySense] Database Seed Completed Successfully! ');
    console.log('======================================================');
    console.log(` Total Vendors:   ${createdVendors.length}`);
    console.log(` Total Shipments: ${createdShipments.length}`);
    console.log(` Total Emissions: ${createdEmissions.length}`);
    console.log('======================================================\n');
  } catch (error) {
    console.error(`[Seed Error] Seeding failed: ${error.message}`);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    console.log('[Seed] Closing database connection...');
    await mongoose.connection.close();
    console.log('[Seed] Connection closed. Exiting process.');
  }
};

// Execute seed if run directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
