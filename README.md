# 🌍 SupplySense - Supply Chain Carbon Emission Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://www.mongodb.com/)
[![React Version](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/)

> **Enterprise-grade supply chain sustainability platform to audit, forecast, and reduce Scope 1, 2, and 3 carbon emissions across multi-tier vendor networks.**

---

## 📖 Project Overview

**SupplySense** is a full-stack carbon emissions accounting and supply chain intelligence platform designed for sustainability officers, supply chain managers, and ESG auditors. Modern multinational organizations face increasing regulatory requirements (such as CSRD, SEC climate disclosure rules, and the GHG Protocol) requiring granular, verifiable greenhouse gas accounting across their entire value chain.

The platform provides end-to-end visibility into vendor sustainability performance, logistics freight emissions, and Scope 1/2/3 breakdown profiles. By pairing real-time transactional tracking with automated lifecycle calculations (e.g. Mongoose pre-save transport emission engines), SupplySense transforms raw procurement telemetry into actionable decarbonization roadmaps.

To complement operational CRUD capabilities, SupplySense integrates an advanced **Python Analytics Engine** powered by NumPy, Pandas, and PyMongo. This engine executes statistical outlier detection to uncover carbon hotspots, calculates empirical freight efficiency ratings (kg CO₂e per tonne-km), and performs linear regression modeling to forecast emission trends across future quarters.

---

## 🏛 Architecture Diagram

SupplySense follows a decoupled **3-Layer Architecture** designed for high throughput, data integrity, and analytical depth:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER (Frontend)                       │
│  React 18 Dashboard · Recharts Data Visualizations · Axios API Client   │
│  - Scope 1/2/3 Pie Breakdowns     - Monthly Emissions Trend Charts     │
│  - Vendor ESG Leaderboards        - Transport Mode Efficiency Radar     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST / JSON (API Key Auth)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API & BUSINESS LOGIC LAYER                       │
│  Node.js 18 · Express REST Engine · Helmet · Rate-Limiting · Mongoose   │
│  - Resource CRUD Controllers       - Input Validation (validators.js)   │
│  - Dynamic Query Filters          - Pre-Save Hook Emission Calculator  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose Driver (tcp://27017)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                             │
│                           MongoDB 7.0 Server                            │
│  Collections: [vendors] ──────< [shipments] ──────< [emissions]         │
│  - Aggregation Pipelines ($lookup, $group, $unwind, $sort, $project)   │
│  - Compound Indexes on Vendor, Scope, Dates, and Transport Modes        │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │ PyMongo Driver (ELT Aggregations)
┌────────────────────────────────────┴────────────────────────────────────┐
│                    ANALYTICS & FORECASTING ENGINE                       │
│  Python 3.10+ · NumPy · Pandas · PyMongo · Tabulate CLI Runner          │
│  - 75th Percentile Outlier Hotspot Identification                       │
│  - Linear Regression Forecasting (np.polyfit OLS)                       │
│  - Scope 3 Deep-Dive & Freight Carbon Intensity (kg CO₂e / tonne-km)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3-Layer Design Highlights:
1. **Node.js / Express API Backend**: Manages real-time data ingestion, input sanitation, authentication headers (`X-API-Key`), and Mongoose pre-save hooks for automated freight emission calculation.
2. **React Dashboard Frontend**: Interactive user interface utilizing Recharts to render executive-level visualizations, ESG scoring matrices, and multi-parameter filtering.
3. **Python Analytics Engine**: Direct database connectivity via PyMongo for statistical transformations, linear regression trend fitting, and formatted CLI reporting.

---

## 🛠 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Backend API** | ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) | RESTful API server with rate limiting, Helmet security, and CORS |
| **ODM / DB** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white) | Document store with aggregation pipelines, indexes, and schema hooks |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat-square) | Single-page analytics dashboard with reactive charting widgets |
| **Analytics Engine**| ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![NumPy](https://img.shields.io/badge/NumPy-013243?style=flat-square&logo=numpy&logoColor=white) ![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat-square&logo=pandas&logoColor=white) | Statistical computing, percentile thresholds, regression, and CLI |
| **DevOps / Container**| ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Multi-container composition with automatic service discovery |

---

## 🌟 Key Features

### 🚀 Backend Services
- **Automated Lifecycle Emission Calculations**: Mongoose pre-save middleware computes transport carbon emissions using DEFRA factors and refrigeration penalties whenever a shipment is recorded.
- **RESTful Resource Architecture**: Clean CRUD endpoints for vendors, shipments, and emission records with pagination (`page`, `limit`), sorting, and multi-field filtering.
- **Multi-Layer Data Sanitation**: Field-level validation via dedicated validation utilities and Mongoose schema constraints.
- **API Key Guard**: Header-based authentication (`X-API-Key`) with configurable rate limiting and Helmet protection.

### 📊 Frontend Dashboard
- **Executive KPI Cards**: Real-time display of total emissions, Scope 1/2/3 breakdown, active vendors count, and high-risk flags.
- **Scope Breakdown Pie Charts**: Interactive breakdown separating Scope 1 (Direct), Scope 2 (Energy), and Scope 3 (Value Chain).
- **Temporal Trends & Trajectories**: Monthly emission volume charts highlighting historical changes and spikes.
- **Vendor ESG Leaderboard**: Sortable table ranking suppliers by Sustainability Score (0–100), risk tier, and total carbon footprint.
- **Logistics Transport Matrix**: Comparative efficiency view across Air, Road, Sea, Rail, and Multimodal freight.

### 🔬 Python Analytics Engine
- **Carbon Hotspot Detection**: Statistical outlier identification using configurable percentile cutoffs (`np.percentile`) to pinpoint high-emission suppliers.
- **Predictive Trend Modeling**: Ordinary least squares linear regression (`np.polyfit`) extrapolating monthly trajectories with non-negative clamping.
- **Scope 3 Deep Dive**: Granular categorization across purchased goods, upstream logistics, business travel, and waste disposal.
- **Freight Carbon Intensity**: Normalizes emissions against freight work (`kg CO₂e per tonne-km`) to rank transport modes by environmental efficiency.
- **Tabular Terminal Reporter**: Publication-grade ASCII tables powered by `tabulate` for automated batch reporting and CI/CD pipelines.

---

## 🗄 Data Model & Schema Design

The SupplySense data architecture is modeled around three core collections in MongoDB:

```
 vendors (1) ───────< (N) shipments
 vendors (1) ───────< (N) emissions
```

### 1. `vendors` Collection
Represents suppliers, manufacturers, and logistics partners.
```json
{
  "_id": "ObjectId('65f1a1001234567890abcdef')",
  "name": "Apex Global Logistics",
  "industry": "Transportation & Logistics",
  "tier": "Tier 1",
  "sustainabilityScore": 82,
  "riskLevel": "Low",
  "certifications": ["ISO 14001", "B-Corp", "Carbon Trust Standard"],
  "location": {
    "country": "Germany",
    "region": "Bavaria",
    "coordinates": { "lat": 48.1351, "lng": 11.5820 }
  },
  "contact": { "email": "sustainability@apexlogistics.com", "phone": "+49-89-123456" },
  "createdAt": "2024-01-15T08:30:00.000Z",
  "updatedAt": "2024-01-15T08:30:00.000Z"
}
```

### 2. `shipments` Collection
Captures physical transport movements and automated emissions.
```json
{
  "_id": "ObjectId('65f1a2001234567890abcdef')",
  "shipmentId": "SHP-2024-0089",
  "vendor": "ObjectId('65f1a1001234567890abcdef')",
  "origin": { "name": "Munich Distribution Hub", "coordinates": { "lat": 48.1351, "lng": 11.5820 } },
  "destination": { "name": "Rotterdam Port Terminal", "coordinates": { "lat": 51.9244, "lng": 4.4777 } },
  "distance": 820.5,
  "weight": 14500.0,
  "transportMode": "Rail",
  "isRefrigerated": false,
  "carbonEmission": 356.92,
  "cost": 3200.00,
  "status": "Delivered",
  "departureDate": "2024-02-01T06:00:00.000Z",
  "arrivalDate": "2024-02-02T18:00:00.000Z"
}
```

### 3. `emissions` Collection
GHG Protocol Scope 1/2/3 accounting records with verification audit trail.
```json
{
  "_id": "ObjectId('65f1a3001234567890abcdef')",
  "vendor": "ObjectId('65f1a1001234567890abcdef')",
  "scope": "Scope 3",
  "category": "Upstream Transportation",
  "amount": 12450.75,
  "unit": "kg CO2e",
  "reportingPeriod": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-03-31T23:59:59.000Z"
  },
  "methodology": "Distance-based activity method (DEFRA 2023 factors)",
  "verificationStatus": "Verified",
  "dataQuality": "Calculated",
  "notes": "Audited during Q1 external ESG verification cycle.",
  "createdAt": "2024-04-05T10:00:00.000Z"
}
```

---

## 🧮 Carbon Emission Calculation Engine

Freight shipment carbon emissions are computed through a Mongoose pre-save hook enforcing standard DEFRA / GHG Protocol emission factors:

$$\text{carbonEmission} = \left(\frac{\text{weight}_{\text{kg}}}{1000}\right) \times \text{distance}_{\text{km}} \times \text{emissionFactor} \times (\text{refrigerationMultiplier})$$

### Emission Factors Reference Table
| Transport Mode | Emission Factor ($\text{kg CO}_2\text{e} / \text{tonne-km}$) | Climate Impact Relative to Sea Freight |
|---|---|---|
| **Air** | **0.500** | ~33.3× heavier emission footprint |
| **Road** | **0.100** | ~6.7× heavier emission footprint |
| **Multimodal** | **0.080** | ~5.3× heavier emission footprint |
| **Rail** | **0.030** | ~2.0× heavier emission footprint |
| **Sea** | **0.015** | Baseline most carbon-efficient mode |

- **Refrigeration Multiplier**: If `isRefrigerated: true`, a **1.2× multiplier** (+20%) is applied to reflect diesel auxiliary power and mechanical cooling energy consumption.
- **Client Override Support**: If a verified `carbonEmission` measurement is explicitly passed in the payload, the pre-save hook preserves the measured value (`dataQuality: 'Measured'`), otherwise defaulting to calculated estimates.

---

## 🌐 GHG Protocol Scopes Demystified

SupplySense structures all greenhouse gas disclosures in accordance with the international **Greenhouse Gas Protocol Corporate Accounting and Reporting Standard**:

| Scope | Definition | Operational Boundary | SupplySense Categories |
|---|---|---|---|
| **Scope 1** | **Direct Emissions** | Emissions from sources directly owned or controlled by the reporting organization. | `Direct Combustion`, `Fleet Vehicles`, `Process Emissions` |
| **Scope 2** | **Indirect Energy Emissions** | Emissions from the generation of purchased electricity, steam, heating, or cooling consumed by the organization. | `Purchased Electricity`, `Purchased Heating`, `Purchased Steam` |
| **Scope 3** | **Value Chain Emissions** | All other indirect emissions occurring upstream or downstream across supplier networks and product lifecycles. | `Upstream Transportation`, `Purchased Goods & Services`, `Business Travel`, `Waste Disposal`, `Capital Goods` |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **MongoDB**: `v6.0` or `v7.0` (Local service or MongoDB Atlas URI)
- **Python**: `v3.10` or higher with `pip`
- **Docker & Docker Compose** (Optional, for containerized execution)

---

### 1. Database Setup (MongoDB)
Ensure MongoDB is running locally on the default port `27017`:
```bash
# Start MongoDB service (systemd)
sudo systemctl start mongod

# Or start MongoDB using Docker
docker run -d --name supplysense-mongo -p 27017:27017 -v mongo_data:/data/db mongo:7.0
```

---

### 2. Backend API Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start development server
npm run dev
# The backend will be available at http://localhost:5000
```

---

### 3. Frontend Dashboard Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start React development server
npm start
# The dashboard will open at http://localhost:3000
```

---

### 4. Python Analytics Engine Setup
```bash
# Navigate to analytics directory
cd analytics

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install analytics dependencies
pip install -r requirements.txt

# Run the complete analytics suite in your terminal
python run_analysis.py --mongo-uri mongodb://localhost:27017 --db-name supplysense
```

---

### 5. Seeding the Database
To populate the database with realistic sample suppliers, logistics shipments, and Scope 1/2/3 emission records:
```bash
# From the backend directory
cd backend
npm run seed
# or: node scripts/seed.js
```

---

## 🐳 Docker Compose Quickstart

Launch the entire ecosystem (MongoDB + Express Backend + React Frontend) with a single command:

```bash
# Start all services
docker compose up -d

# Verify running containers
docker compose ps

# Tail container logs
docker compose logs -f backend
```

Services will be accessible at:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`

---

## 📡 API Reference

All protected API endpoints require the `X-API-Key` header matching the backend `API_KEY` configuration.

### Vendors (`/api/vendors`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/vendors` | List vendors with search, tier/industry filtering, and pagination | No |
| `POST` | `/api/vendors` | Register a new vendor profile | Yes (`X-API-Key`) |
| `GET` | `/api/vendors/:id` | Fetch detailed vendor profile by ObjectId | No |
| `PUT` | `/api/vendors/:id` | Update existing vendor details and ESG metadata | Yes (`X-API-Key`) |
| `DELETE` | `/api/vendors/:id` | Remove a vendor from the system | Yes (`X-API-Key`) |
| `GET` | `/api/vendors/stats/overview` | Aggregated supplier stats (tier distribution, avg scores) | No |

### Shipments (`/api/shipments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/shipments` | Query shipments with date ranges, vendor, and transport mode filters | No |
| `POST` | `/api/shipments` | Create shipment record (auto-calculates carbon emissions) | Yes (`X-API-Key`) |
| `GET` | `/api/shipments/:id` | Fetch specific shipment by ID | No |
| `PUT` | `/api/shipments/:id` | Update shipment status, coordinates, or weight | Yes (`X-API-Key`) |
| `DELETE` | `/api/shipments/:id` | Delete a shipment record | Yes (`X-API-Key`) |
| `GET` | `/api/shipments/analytics/overview` | Freight summary: total carbon, mode breakdowns, tonne-km | No |

### Emissions (`/api/emissions`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/emissions` | Query emissions by scope, verification status, and date range | No |
| `POST` | `/api/emissions` | Log a Scope 1/2/3 emission event | Yes (`X-API-Key`) |
| `GET` | `/api/emissions/:id` | Fetch specific emission record | No |
| `PUT` | `/api/emissions/:id` | Update verification status or emission amount | Yes (`X-API-Key`) |
| `DELETE` | `/api/emissions/:id` | Remove emission record | Yes (`X-API-Key`) |
| `GET` | `/api/emissions/dashboard/overview` | High-level metrics for React charts (scopes, trends, top emitters) | No |

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/supplysense
API_KEY=supplysense_secure_api_key_2024
CLIENT_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Frontend Configuration (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_KEY=supplysense_secure_api_key_2024
```

### Analytics Engine Configuration (`analytics/.env`)
```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=supplysense
HOTSPOT_PERCENTILE=75.0
PREDICTION_MONTHS=6
```

---

## 💻 Python Analytics Engine CLI Demo

Run the command-line suite to output executive tables directly in your terminal:

```bash
$ python analytics/run_analysis.py --hotspot-percentile 75 --months-ahead 6
```

### Sample Output Preview:

```text
================================================================================
 🌍  SUPPLYSENSE — SUPPLY CHAIN CARBON EMISSION ANALYTICS ENGINE
================================================================================
 Connecting to: mongodb://localhost:27017
 Database:      supplysense
================================================================================
✅ Successfully connected to MongoDB.

────────────────────────────────────────────────────────────────────────────────
📍 SECTION 1: CARBON HOTSPOT IDENTIFICATION (75.0th Percentile Threshold)
────────────────────────────────────────────────────────────────────────────────
Threshold Percentile:    75.0%
Cutoff Threshold Value:  48,250.00 kg CO2e
Total Vendors Evaluated: 12
Hotspot Vendors Flagged: 3

+-------------------------+----------------------+--------+--------------+------------------+---------+------------+
| Vendor Name             | Industry             | Tier   | Risk Level   | Total (kg CO2e)  | Records | Status     |
+=========================+======================+========+==============+==================+=========+============+
| Titan Heavy Foundries   | Manufacturing        | Tier 1 | High         | 92,450.00        | 24      | 🚨 HOTSPOT |
| TransPacific Shipping   | Logistics            | Tier 1 | Critical     | 68,120.00        | 18      | 🚨 HOTSPOT |
| EuroFreight Express     | Logistics            | Tier 2 | Medium       | 51,340.00        | 12      | 🚨 HOTSPOT |
| GreenLeaf Packaging     | Packaging            | Tier 2 | Low          | 14,200.00        | 8       | ✅ OK      |
| Nordics Clean Energy    | Renewable Energy     | Tier 3 | Low          | 3,110.00         | 4       | ✅ OK      |
+-------------------------+----------------------+--------+--------------+------------------+---------+------------+

────────────────────────────────────────────────────────────────────────────────
🚢 SECTION 5: LOGISTICS & TRANSPORT MODE EFFICIENCY
────────────────────────────────────────────────────────────────────────────────
+--------+------------+------------+------------------+------------------+------------+------------------+---------------------+
| Rank   | Mode       | Shipments  | Total Dist (km)  | Total Weight (kg)| Tonne-km   | Carbon (kg CO2e) | Intensity (kg/t-km) |
+========+============+============+==================+==================+============+==================+=====================+
| #1     | Sea        | 45         | 182,400.0        | 2,450,000.0      | 9,840,120  | 147,601.80       | 0.0150              |
| #2     | Rail       | 62         | 74,100.0         | 890,000.0        | 1,062,500  | 31,875.00        | 0.0300              |
| #3     | Multimodal | 31         | 38,200.0         | 340,000.0        | 418,900    | 33,512.00        | 0.0800              |
| #4     | Road       | 154        | 112,500.0        | 620,000.0        | 451,200    | 45,120.00        | 0.1000              |
| #5     | Air        | 28         | 96,400.0         | 84,000.0         | 289,200    | 144,600.00       | 0.5000              |
+--------+------------+------------+------------------+------------------+------------+------------------+---------------------+
* Note: Emission intensity = kg CO2e / tonne-km. Lower intensity = higher carbon efficiency.
```

---

## 📸 Screenshots & UI Showcase

*(Place application dashboard screenshots in this section)*

| Dashboard Overview | Scope 1/2/3 Breakdown |
|---|---|
| ![Dashboard Overview Placeholder](https://via.placeholder.com/600x350/0f172a/38bdf8?text=SupplySense+Executive+Dashboard) | ![Scope Breakdown Placeholder](https://via.placeholder.com/600x350/0f172a/34d399?text=Scope+1+2+3+Recharts+Breakdown) |

| Vendor ESG Leaderboard | Logistics Efficiency Radar |
|---|---|
| ![Vendor ESG Leaderboard Placeholder](https://via.placeholder.com/600x350/0f172a/fbbf24?text=Vendor+ESG+Scorecard+%26+Leaderboard) | ![Logistics Matrix Placeholder](https://via.placeholder.com/600x350/0f172a/a78bfa?text=Transport+Mode+Carbon+Efficiency) |

---

## 🔮 Future Improvements & Scaling Roadmap

- **MongoDB Time-Series Collections**: Migrate the `emissions` collection to native MongoDB Time Series collections (`timeField: 'reportingPeriod.startDate'`, `metaField: 'vendor'`) for compressed storage and optimized window aggregations.
- **Real-Time Telemetry Streaming**: Introduce Apache Kafka or AWS Kinesis to ingest high-frequency IoT GPS and fuel telemetry from carrier telematics systems.
- **Advanced Forecasting Models**: Upgrade linear regression trend modeling to seasonality-aware models (Facebook Prophet, ARIMA, or AWS SageMaker DeepAR) to accommodate quarter-end shipping surges and seasonal winter heating loads.
- **Enterprise Multi-Tenancy**: Support multi-tenant corporate accounts via JWT organization claim isolation and MongoDB field-level access control.
- **Automated CSRD / SEC Report Generator**: Export one-click compliance PDF reports formatted according to European Sustainability Reporting Standards (ESRS E1 Climate Change).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with 💚 for sustainable global supply chains.
</p>
