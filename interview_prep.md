# 🎯 Amazon Data Engineer Intern – Interview Prep (SupplySense)

> **Interview in:** 2 days · **Format:** Resume-based behavioral + technical deep-dive
> Amazon interviewers probe your **design decisions, trade-offs, scale thinking, and data modeling depth**. They won't open GitHub — but they *will* drill into every bullet point.

---

## Section 1 — Project Overview & "Tell Me About It" Questions

### Q1. Walk me through SupplySense at a high level.

> **Answer:**
> SupplySense is a full-stack supply chain sustainability platform I built to help enterprises track, audit, and reduce carbon emissions across their vendor network. The architecture has three layers:
>
> 1. **A Node.js/Express REST API backend** with MongoDB as the data store — it manages vendors, shipments, and emission records through CRUD endpoints with input validation and API-key authentication.
> 2. **A React dashboard frontend** that visualizes carbon metrics using Recharts — scope-wise breakdowns (pie charts), monthly emission trends (bar charts), transport-mode analysis, and a vendor ESG leaderboard.
> 3. **A Python analytics engine** using PyMongo, Pandas, and NumPy that connects directly to MongoDB for advanced analytics — carbon hotspot detection using percentile thresholds, linear regression for emission trend prediction, and Scope 3 deep-dive analysis.
>
> The data model centers around three MongoDB collections: **vendors** (with sustainability scores, risk levels, tier classifications), **shipments** (with auto-calculated carbon emissions via a Mongoose pre-save hook), and **emissions** (Scope 1/2/3 records with verification status and data quality tags).

---

### Q2. Why did you choose this tech stack? Why MongoDB over a relational DB?

> **Answer:**
> I chose MongoDB for several data-engineering-relevant reasons:
>
> - **Schema flexibility:** Vendor telemetry and shipment logs arrive in heterogeneous formats — different vendors report different fields. MongoDB's document model lets me store nested objects like `location: { country, region, coordinates: { lat, lng } }` and `reportingPeriod: { startDate, endDate }` naturally without complex JOIN tables.
> - **Aggregation framework:** MongoDB's aggregation pipelines are extremely powerful for the kind of analytics I needed — `$group`, `$lookup`, `$unwind`, `$sort`, `$match` — I use them heavily for scope breakdowns, vendor emission rankings, and monthly trend calculations. This avoids the overhead of a separate OLAP layer for moderate-scale analytics.
> - **Horizontal scalability:** If this scaled to thousands of vendors and millions of shipment records, MongoDB sharding would be straightforward.
>
> **Trade-off I'd acknowledge:** For strict relational integrity (e.g., enforcing that every emission record references a valid vendor), a relational DB with foreign keys would provide stronger guarantees. In MongoDB, I handle this at the application layer using Mongoose `ref` and `$lookup` for joins.

---

### Q3. What are Scope 1, 2, and 3 emissions? How did you model them?

> **Answer:**
> These are categories from the GHG Protocol:
>
> | Scope | Definition | My Categories |
> |-------|-----------|---------------|
> | **Scope 1** | Direct emissions from owned/controlled sources | Direct Combustion, Fleet Vehicles, Process Emissions |
> | **Scope 2** | Indirect from purchased energy | Purchased Electricity, Purchased Heating |
> | **Scope 3** | All other value-chain emissions | Upstream Transportation, Purchased Goods, Business Travel, Waste Disposal |
>
> In my Emission schema, each record has a `scope` field (enum: `'Scope 1', 'Scope 2', 'Scope 3'`), a `category` string, an `amount` in kg CO₂e, a `verificationStatus` (Pending/Verified/Rejected), and a `dataQuality` flag (Measured/Calculated/Estimated). This lets me aggregate by scope using `$group: { _id: '$scope', total: { $sum: '$amount' } }` and filter by verification status for audit compliance.

---

## Section 2 — Data Modeling & Schema Design (Core DE Questions)

### Q4. Walk me through your data model. How are the collections related?

> **Answer:**
> I have three core collections:
>
> ```
> vendors ──< shipments    (one vendor → many shipments)
> vendors ──< emissions    (one vendor → many emission records)
> ```
>
> - **Vendors** is the master entity — each vendor has a `sustainabilityScore` (0–100), `riskLevel` (Low/Medium/High/Critical), `tier` (Tier 1/2/3), and `certifications` array.
> - **Shipments** reference a vendor via `vendor: ObjectId ref 'Vendor'`. Each shipment stores origin/destination with coordinates, transport mode, distance, weight, cost, and a `carbonEmission` field that gets auto-calculated.
> - **Emissions** also reference a vendor. Each record captures scope, category, amount, reporting period (date range), methodology, and data quality.
>
> The relationships are enforced through Mongoose `ref` fields and resolved at query time using `$lookup` (MongoDB's left outer join equivalent) or Mongoose `.populate()`.

---

### Q5. How do you calculate carbon emissions for a shipment?

> **Answer:**
> I use a Mongoose **pre-save middleware hook** on the Shipment schema. The formula is:
>
> ```
> carbonEmission = (weight_kg / 1000) × distance_km × emissionFactor
> ```
>
> The emission factors are in **kg CO₂e per tonne-km**:
> - Air: 0.5 (highest — ~33x more than sea)
> - Road: 0.1
> - Multimodal: 0.08
> - Rail: 0.03
> - Sea: 0.015 (lowest)
>
> If the shipment is refrigerated (`isRefrigerated: true`), I apply a **1.2× multiplier** because refrigeration units consume additional fuel.
>
> The pre-save hook only calculates if `carbonEmission` isn't already provided — this lets clients override with measured values when available, falling back to calculated estimates otherwise. This aligns with the `dataQuality` concept in my emission records (Measured vs. Calculated vs. Estimated).

---

### Q6. If you had to re-design this schema for 10× or 100× the data volume, what would you change?

> **Answer:**
> Several things:
>
> 1. **Time-series optimization:** I'd either move to MongoDB Time Series collections (available since v5.0) for emission records, or consider a dedicated time-series DB like TimescaleDB. My emission records have `reportingPeriod` timestamps, and time-series queries dominate the analytics workload.
> 2. **Sharding strategy:** I'd shard the `shipments` collection by `vendor` (hashed shard key) to distribute load. Emissions would be shard-keyed on `{ vendor, reportingPeriod.startDate }` for range queries.
> 3. **Pre-aggregation:** Instead of computing scope breakdowns and monthly trends on every dashboard load, I'd create materialized views or a separate `emission_summaries` collection updated via Change Streams — essentially a **Lambda architecture** pattern.
> 4. **Data warehouse layer:** For complex cross-dimensional analytics (vendor × scope × time × transport mode), I'd introduce a star schema in something like Redshift or BigQuery with `fact_emissions` and dimension tables, using an ETL pipeline (Airflow + dbt) to load from the operational MongoDB.

---

### Q7. Why did you embed location as a nested object instead of a separate collection?

> **Answer:**
> This is a classic **embed vs. reference** decision in MongoDB. I embedded because:
> - Locations are **owned data** — a vendor's location doesn't exist independently or get shared across entities.
> - Queries almost always need the location *with* the parent document (e.g., "show me all vendors in India with their coordinates").
> - Embedding avoids an extra `$lookup` on every query, improving read performance.
>
> If locations were shared entities (e.g., warehouses used by multiple vendors), I'd extract them into a separate collection and reference by ObjectId.

---

## Section 3 — ETL & Data Pipeline Questions

### Q8. Describe your ETL pipeline. How does data flow through the system?

> **Answer:**
> The ETL flow has three stages:
>
> 1. **Extract:** Data enters through REST API POST endpoints (`/api/vendors`, `/api/shipments`, `/api/emissions`). In a production scenario, this would also include batch ingestion from CSV/Excel uploads, webhook receivers for vendor ERP systems, and scheduled pulls from third-party carbon databases.
>
> 2. **Transform/Validate:** Before hitting the database:
>    - My `validators.js` utility runs field-level validation — required fields, enum checks (e.g., transport mode must be one of Road/Rail/Sea/Air/Multimodal), numeric range validation (sustainability score 0–100), date format validation.
>    - Mongoose schema validation provides a second layer (type coercion, enum enforcement, defaults).
>    - The pre-save hook on Shipments **derives** the carbon emission — this is a computed/enrichment transform.
>
> 3. **Load:** Validated, enriched documents are persisted to MongoDB. Timestamps (`createdAt`, `updatedAt`) are auto-managed by Mongoose.
>
> For the Python analytics layer, I treat MongoDB as the source and run **ELT** — extract raw data, then transform in Python using Pandas DataFrames and NumPy for statistical computations that are awkward in aggregation pipelines (like percentile-based hotspot detection and linear regression).

---

### Q9. How do you handle data validation? What happens if bad data comes in?

> **Answer:**
> I have **three validation layers**:
>
> 1. **Application-level** (`validators.js`): Checks required fields, validates enums, ensures numerics are positive, validates date ranges (arrival after departure). Returns descriptive 400 errors.
> 2. **Schema-level** (Mongoose): Enforces types, enums, min/max constraints, required fields. Throws `ValidationError` caught by my error-handling middleware.
> 3. **API-level**: Rate limiting via `express-rate-limit` to prevent abuse, Helmet for security headers, API key authentication via `X-API-Key` header.
>
> If validation fails at any layer, the request is rejected with a 400 status and a descriptive error message — data never reaches MongoDB in a dirty state. This is important for downstream analytics accuracy.

---

### Q10. If you needed to ingest data from 500 vendors simultaneously via file uploads (CSV/Excel), how would you architect that?

> **Answer:**
> I'd build an **async batch ingestion pipeline**:
>
> 1. **Upload endpoint** accepts the file, stores it in S3/GCS, and publishes a message to an SQS/Kafka queue with the file reference.
> 2. **Worker service** (could be AWS Lambda or a persistent worker) pulls messages, downloads the file, and processes rows:
>    - Parse CSV → validate each row against my schema
>    - Separate valid vs. invalid rows
>    - Bulk-insert valid rows using `insertMany()` with `ordered: false` (continues on error)
>    - Write invalid rows to a dead-letter queue or error log for manual review
> 3. **Progress tracking** via a `batch_jobs` collection so the dashboard can show upload status.
>
> At Amazon scale, I'd use **AWS Glue** for the ETL, **S3** for staging, and **Step Functions** to orchestrate the pipeline.

---

## Section 4 — Aggregation & Analytics (The "How Did You Build It" Questions)

### Q11. Explain your MongoDB aggregation pipelines. Give me a specific example.

> **Answer:**
> My most complex pipeline is in `getEmissionDashboard` — the vendor emissions ranking:
>
> ```javascript
> const vendorEmissions = await Emission.aggregate([
>   { $group: { _id: '$vendor', totalEmissions: { $sum: '$amount' }, records: { $sum: 1 } } },
>   { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendorInfo' } },
>   { $unwind: '$vendorInfo' },
>   { $sort: { totalEmissions: -1 } },
>   { $limit: 10 }
> ]);
> ```
>
> Step by step:
> 1. **`$group`** — Groups all emission records by vendor ObjectId, summing their amounts and counting records.
> 2. **`$lookup`** — Performs a left outer join to the `vendors` collection to get vendor names and metadata.
> 3. **`$unwind`** — Flattens the `vendorInfo` array (since `$lookup` returns an array, even for 1:1 joins).
> 4. **`$sort`** — Orders by total emissions descending to find the worst offenders.
> 5. **`$limit`** — Returns only the top 10.
>
> This is essentially a `GROUP BY vendor JOIN vendors ORDER BY total DESC LIMIT 10` in SQL terms.

---

### Q12. How does your carbon hotspot detection work?

> **Answer:**
> In my Python `CarbonAnalytics` class, the `identify_carbon_hotspots()` method:
>
> 1. Runs an aggregation pipeline to compute total emissions per vendor (with a `$lookup` to get vendor names).
> 2. Extracts the emissions array and computes the **75th percentile** using `np.percentile()`.
> 3. Flags any vendor whose total emissions exceed that threshold as a "hotspot."
>
> The threshold is configurable — you can pass `threshold_percentile=90` for stricter detection. This is a **statistical outlier detection** approach: rather than using an arbitrary absolute threshold, it adapts to the distribution of the data. In a dataset where most vendors emit 100–500 kg CO₂e but three vendors emit 2000+, those three get flagged.
>
> **Why percentile over standard deviation?** Emission data is often right-skewed (a few heavy emitters). Percentile-based thresholds are more robust to skewed distributions than mean ± σ approaches.

---

### Q13. Tell me about your emission trend prediction. How accurate is it?

> **Answer:**
> I use `np.polyfit(x, y, 1)` — a **simple linear regression** (degree-1 polynomial fit) on monthly aggregated emission totals. It finds the best-fit line through historical data points and extrapolates `months_ahead` (default 6) into the future.
>
> **Limitations I'd honestly acknowledge:**
> - Linear regression assumes a constant rate of change — it can't capture seasonality (e.g., higher emissions in winter due to heating).
> - It requires at least 2 data points (I check for this).
> - I clamp predictions to `max(0, predicted)` to avoid negative emission predictions.
>
> **How I'd improve it:**
> - Use **ARIMA or Prophet** (Facebook's time-series library) for seasonality-aware forecasting.
> - Add **exogenous variables** — vendor count changes, shipment volume growth — as regression features.
> - Implement **confidence intervals** rather than point predictions.
> - At Amazon scale, I'd use **SageMaker** with a DeepAR model for multi-variate time-series forecasting.

---

## Section 5 — API Design & Backend Questions

### Q14. How did you design your REST APIs? Walk me through the endpoint structure.

> **Answer:**
> I followed RESTful conventions with resource-based routing:
>
> | Method | Endpoint | Purpose |
> |--------|----------|---------|
> | GET | `/api/vendors` | List with filtering, search, pagination |
> | POST | `/api/vendors` | Create new vendor |
> | GET | `/api/vendors/:id` | Get specific vendor |
> | PUT | `/api/vendors/:id` | Update vendor |
> | DELETE | `/api/vendors/:id` | Delete vendor |
> | GET | `/api/vendors/stats/overview` | Aggregated vendor statistics |
>
> Same pattern for `/api/shipments` (with `/analytics/overview`) and `/api/emissions` (with `/dashboard/overview`).
>
> **Query parameter design for filtering:**
> - `GET /api/shipments?vendor=<id>&status=Delivered&transportMode=Air&startDate=2024-01-01&endDate=2024-06-30&page=1&limit=20`
> - I build the MongoDB filter object dynamically — only adding conditions for parameters that are actually provided, so the same endpoint handles both filtered and unfiltered requests.

---

### Q15. How do you handle authentication and security?

> **Answer:**
> - **API key authentication** via `X-API-Key` header — my middleware checks it against the server's `process.env.API_KEY`. Simple but effective for server-to-server communication.
> - **Helmet** middleware for HTTP security headers (XSS protection, content-type sniffing prevention, etc.)
> - **express-rate-limit** to prevent API abuse.
> - **CORS** configured to control which origins can access the API.
> - **Input validation** at both application and schema levels to prevent injection.
>
> **What I'd add for production:**
> - OAuth 2.0 / JWT tokens for user-level authentication and role-based access control.
> - Request signing for data integrity.
> - Field-level encryption for sensitive vendor data (contract values, contact info).

---

### Q16. How do you handle pagination? Why is it important for a data-heavy application?

> **Answer:**
> I implement **offset-based pagination** with `page` and `limit` query parameters:
>
> ```javascript
> const page = parseInt(req.query.page) || 1;
> const limit = parseInt(req.query.limit) || 10;
> const skip = (page - 1) * limit;
> const results = await Model.find(filter).skip(skip).limit(limit).sort(sortOptions);
> const total = await Model.countDocuments(filter);
> ```
>
> The response includes `{ data, page, totalPages, totalCount }` for the frontend to render pagination controls.
>
> **Why it matters:** Without pagination, a `GET /api/emissions` call with 100K records would:
> - Exhaust server memory loading all documents
> - Saturate network bandwidth
> - Crash the frontend trying to render 100K rows
>
> **Trade-off:** Offset pagination degrades at scale (`skip(10000)` still scans 10K docs). For production, I'd switch to **cursor-based pagination** using `_id` as the cursor — `find({ _id: { $gt: lastSeenId } }).limit(20)` — which is O(1) regardless of offset.

---

## Section 6 — Amazon-Specific & Behavioral Questions (LP-Aligned)

### Q17. Tell me about a time you had to make a trade-off between speed and quality. *(Bias for Action / Deliver Results)*

> **Answer:**
> When building the emission trend prediction, I had to decide between implementing a proper time-series model (ARIMA/Prophet) or a simple linear regression. I chose **linear regression** because:
> - The primary goal was to demonstrate the *capability* of predictive analytics, not production-grade forecasting.
> - With limited historical data (seed data spanning a few months), a complex model would overfit.
> - I shipped the feature in a day rather than spending a week on ARIMA tuning.
>
> I documented the limitations and exactly how I'd improve it (Prophet, exogenous variables, SageMaker DeepAR). This let me **deliver a working feature fast** while maintaining a clear upgrade path.

---

### Q18. How did you handle a situation where you didn't have all the information? *(Learn and Be Curious)*

> **Answer:**
> I didn't have domain expertise in GHG emissions accounting when I started. I researched the **GHG Protocol Corporate Standard** to understand Scope 1/2/3 categorization, studied EPA emission factor databases for transport-mode-specific factors, and cross-referenced values with published lifecycle assessments. For example, my emission factor of 0.5 kg CO₂e/tonne-km for air freight aligns with DEFRA's published factors. I didn't just pick arbitrary numbers — each factor is defensible.

---

### Q19. If you could go back and re-do one thing in this project, what would it be? *(Insist on the Highest Standards)*

> **Answer:**
> I'd build a **proper data quality framework**. Right now, I have a `dataQuality` enum (Measured/Calculated/Estimated) on emission records, but I don't systematically track data lineage — which vendor system did this number come from? When was it last validated? What's the uncertainty range?
>
> In a production system, I'd add:
> - **Data lineage tracking** (source system, ingestion timestamp, transformation history)
> - **Confidence scores** on calculated emissions
> - **Automated anomaly detection** (flag an emission record that's 10× higher than historical average)
> - **Data freshness SLAs** (alert if a vendor hasn't reported in 30 days)

---

### Q20. How would you scale this to handle Amazon's supply chain? *(Think Big)*

> **Answer:**
> Amazon's supply chain has ~100K+ suppliers, millions of shipments/day, and petabytes of logistics data. I'd re-architect completely:
>
> | Current | At Amazon Scale |
> |---------|----------------|
> | MongoDB | **Redshift** (warehouse) + **DynamoDB** (operational) |
> | Express REST APIs | **API Gateway + Lambda** (serverless) |
> | Mongoose pre-save hooks | **AWS Glue/EMR** ETL pipelines |
> | Python scripts | **SageMaker** for ML, **Athena** for ad-hoc queries |
> | Single-server | **Kinesis** for real-time streaming ingestion |
> | Manual seed data | **S3 Data Lake** with Glue Catalog |
> | Linear regression | **DeepAR** on SageMaker for time-series forecasting |
>
> The architecture would be: **S3 (raw zone) → Glue ETL → Redshift (curated zone) → QuickSight/custom dashboards**. Real-time metrics via **Kinesis Data Streams → Lambda → DynamoDB → AppSync**.

---

## Section 7 — SQL & Data Manipulation Questions

> Amazon DE interviews often include SQL even if your project uses NoSQL. They may ask you to express your aggregations in SQL.

### Q21. Write the SQL equivalent of your vendor emissions ranking pipeline.

> **Answer:**
> ```sql
> SELECT v.name, v.risk_level,
>        SUM(e.amount) AS total_emissions,
>        COUNT(*) AS record_count
> FROM emissions e
> JOIN vendors v ON e.vendor_id = v.id
> GROUP BY v.id, v.name, v.risk_level
> ORDER BY total_emissions DESC
> LIMIT 10;
> ```

---

### Q22. Write a query to find the month-over-month change in emissions.

> **Answer:**
> ```sql
> WITH monthly AS (
>   SELECT DATE_TRUNC('month', reporting_start_date) AS month,
>          SUM(amount) AS total
>   FROM emissions
>   GROUP BY 1
> )
> SELECT month,
>        total,
>        LAG(total) OVER (ORDER BY month) AS prev_month,
>        total - LAG(total) OVER (ORDER BY month) AS mom_change,
>        ROUND((total - LAG(total) OVER (ORDER BY month)) * 100.0
>              / LAG(total) OVER (ORDER BY month), 2) AS pct_change
> FROM monthly
> ORDER BY month;
> ```

---

### Q23. Write a query to find vendors who exceed the average emission for their tier.

> **Answer:**
> ```sql
> WITH vendor_totals AS (
>   SELECT e.vendor_id, v.name, v.tier, SUM(e.amount) AS total
>   FROM emissions e
>   JOIN vendors v ON e.vendor_id = v.id
>   GROUP BY e.vendor_id, v.name, v.tier
> ),
> tier_avgs AS (
>   SELECT tier, AVG(total) AS avg_emission
>   FROM vendor_totals
>   GROUP BY tier
> )
> SELECT vt.name, vt.tier, vt.total, ta.avg_emission
> FROM vendor_totals vt
> JOIN tier_avgs ta ON vt.tier = ta.tier
> WHERE vt.total > ta.avg_emission
> ORDER BY vt.total DESC;
> ```

---

## Section 8 — System Design & Architecture Questions

### Q24. How would you add real-time emission monitoring (streaming) to this system?

> **Answer:**
> 1. **IoT sensors/GPS trackers** on trucks → publish to **MQTT broker** or directly to **AWS IoT Core**.
> 2. **Kinesis Data Streams** ingests high-throughput events (location, fuel consumption, engine telemetry).
> 3. **Kinesis Data Analytics (Flink)** computes real-time carbon emission per shipment using my emission factors.
> 4. **Lambda** enriches events with vendor metadata from DynamoDB.
> 5. **Kinesis Firehose** sinks to S3 (data lake) and Redshift (warehouse) for batch analytics.
> 6. **AppSync/WebSocket** pushes live updates to the React dashboard.
>
> Key design decision: **Lambda architecture** — maintain both a real-time (speed) layer and a batch (accuracy) layer, with the serving layer merging results.

---

### Q25. How would you handle late-arriving data? (A shipment arrives but its emission data comes 3 days later)

> **Answer:**
> This is a classic **event-time vs. processing-time** problem:
>
> 1. **Watermark-based windows** in the streaming layer — allow a configurable late-arrival window (e.g., 7 days) before closing an aggregation window.
> 2. **Upsert pattern** in the database — when late data arrives, update the existing record rather than creating a duplicate. My shipment schema's `shipmentId` uniqueness constraint already supports this.
> 3. **Recomputation triggers** — when an emission record is updated, trigger re-aggregation of the affected vendor's and month's summaries.
> 4. **Data freshness flags** — mark records as "preliminary" vs. "final" so dashboards can show users which numbers might still change.

---

## Section 9 — Rapid-Fire Technical Questions

### Q26. What's the difference between `$lookup` and `.populate()` in MongoDB?

> **`$lookup`** runs server-side as part of an aggregation pipeline — more efficient for complex queries, supports multiple conditions, and works with `$unwind`, `$match` on joined data.
> **`.populate()`** runs client-side (Mongoose only) — it issues a second query under the hood (`SELECT * FROM vendors WHERE _id IN (...)`) — simpler API but less performant for large datasets. I use `$lookup` in analytics pipelines and `.populate()` in simple CRUD reads.

---

### Q27. What indexing strategy would you use?

> **Answer:**
> - `emissions`: Compound index on `{ vendor: 1, scope: 1, 'reportingPeriod.startDate': -1 }` — covers the most common query pattern (emissions for a vendor, by scope, recent first).
> - `shipments`: Index on `{ vendor: 1, departureDate: -1 }` and `{ transportMode: 1 }`.
> - `vendors`: Index on `{ riskLevel: 1, sustainabilityScore: -1 }` for dashboard sorting.
> - Text index on `vendors.name` for search functionality.

---

### Q28. What happens if MongoDB goes down? How do you ensure data durability?

> **Answer:**
> - **Replica sets** — MongoDB replicates data to secondary nodes. Write concern `w: majority` ensures writes are acknowledged by a majority before confirming.
> - **Journaling** — Write-ahead log ensures crash recovery.
> - **Backups** — Automated snapshots (MongoDB Atlas) or `mongodump` cron jobs.
> - For my project, I'd use **MongoDB Atlas** with automated backups, point-in-time recovery, and cross-region replication.

---

### Q29. Explain the CAP theorem and where MongoDB sits.

> **Answer:**
> CAP theorem: A distributed system can guarantee at most 2 of 3 — **Consistency**, **Availability**, **Partition tolerance**.
>
> MongoDB is **CP by default** — in a network partition, it prioritizes consistency (the primary accepts writes; secondaries may be unavailable). But it's tunable:
> - `readPreference: secondaryPreferred` trades consistency for availability (reads may be stale).
> - `writeConcern: w:1` trades durability for speed.
>
> For my use case (financial/compliance emission data), I'd keep CP — an auditor seeing stale emission numbers is worse than a brief unavailability.

---

### Q30. How does your frontend consume the API? Any state management?

> **Answer:**
> I have an Axios-based API service layer (`frontend/src/services/api.js`) that:
> - Sets a base URL from environment variables
> - Attaches the `X-API-Key` header to every request
> - Exports named functions (`getVendors()`, `getEmissionDashboard()`, etc.)
>
> Components call these in `useEffect` hooks and store results in local component state (`useState`). For a larger app, I'd introduce **React Query** (TanStack Query) for server state caching, deduplication, and background refetching, or **Redux** if complex cross-component state sharing was needed.

---

## Section 10 — Curveball / Deep-Dive Questions

### Q31. A vendor is reporting suspiciously low emissions. How would you detect and handle that?

> **Answer:**
> 1. **Statistical anomaly detection:** Compare the vendor's per-unit emissions against peer vendors in the same industry and tier. If they're below 2 standard deviations of the group mean, flag for review.
> 2. **Cross-validation:** Compare reported Scope 2 emissions against known electricity grid emission factors for their region × their reported energy consumption. If the math doesn't add up, flag it.
> 3. **Temporal anomaly:** If a vendor's emissions dropped 50% quarter-over-quarter with no corresponding change in output volume, flag it.
> 4. **My `verificationStatus` field** exists for exactly this — set it to 'Pending' and require manual audit before marking 'Verified.'

---

### Q32. How would you implement data partitioning for multi-tenant access (different companies using the same platform)?

> **Answer:**
> Three approaches, with trade-offs:
>
> 1. **Collection-level isolation** (separate MongoDB database per tenant): Strongest isolation, but operational overhead.
> 2. **Document-level isolation** (add `tenantId` to every document): Simplest, but requires careful query filtering — a missing `tenantId` filter is a data leak.
> 3. **I'd choose option 2** with middleware that automatically injects `tenantId` into every query based on the authenticated user's JWT claims. Defense in depth: MongoDB field-level access control as a second layer.

---

### Q33. Walk me through a specific bug or challenge you faced and how you debugged it.

> **Answer (use one of these):**
>
> *"The pre-save hook for carbon emission calculation was firing on **updates** too, overwriting manually-entered measured values with calculated ones. I debugged by adding console logs in the hook and realized `this.isModified('weight')` was true on every `save()`. I fixed it by adding a guard: only calculate if `carbonEmission` is falsy — `if (!this.carbonEmission)`. This preserves measured values while still auto-calculating for new shipments where no emission value is provided."*

---

## 🏁 Quick Cheat Sheet — Know These Cold

| Topic | Key Point |
|-------|-----------|
| Emission factors | Air 0.5, Road 0.1, Multimodal 0.08, Rail 0.03, Sea 0.015 (kg CO₂e/tonne-km) |
| Scopes | 1=Direct, 2=Energy, 3=Value chain |
| Hotspot detection | 75th percentile threshold via `np.percentile()` |
| Trend prediction | `np.polyfit(x, y, 1)` — linear regression |
| Key aggregation | `$group` → `$lookup` → `$unwind` → `$sort` → `$limit` |
| Auth | API key via `X-API-Key` header |
| Validation layers | validators.js → Mongoose schema → pre-save hooks |
| Pagination | Offset-based (skip/limit), would upgrade to cursor-based |
| Charts | Recharts — PieChart (scope breakdown), BarChart (monthly trends) |
| Pre-save formula | `(weight/1000) × distance × factor × (1.2 if refrigerated)` |

---

> [!TIP]
> **Amazon's evaluation framework:** They score on Leadership Principles as much as technical depth. Weave in **"Customer Obsession"** (dashboards designed for sustainability officers), **"Dive Deep"** (emission factor research), **"Invent and Simplify"** (pre-save hooks for auto-calculation), and **"Are Right, A Lot"** (choosing MongoDB for schema flexibility).

> [!IMPORTANT]
> **Practice speaking these answers out loud.** Reading and speaking are different skills. Time yourself — each answer should be 60–90 seconds. For the "walk me through" questions, aim for 2 minutes max.
