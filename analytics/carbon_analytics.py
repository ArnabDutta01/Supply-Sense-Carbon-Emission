#!/usr/bin/env python3
"""
SupplySense - Carbon Emission Analytics Engine
==============================================
Provides statistical analysis, hotspot identification, trend forecasting,
and supply chain sustainability metrics across Vendors, Shipments, and Emissions.
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import pymongo
from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables if available
load_dotenv()


class CarbonAnalytics:
    """
    Core analytics engine for the SupplySense carbon emission platform.
    
    Interfaces with MongoDB collections (`vendors`, `shipments`, `emissions`)
    to deliver aggregations, statistical outlier detection, linear regression forecasting,
    and GHG Protocol Scope 1/2/3 breakdown analysis.
    """

    def __init__(
        self,
        mongo_uri: str = "mongodb://localhost:27017",
        db_name: str = "supplysense"
    ):
        """
        Initialize the CarbonAnalytics engine with MongoDB connection.

        Args:
            mongo_uri (str): MongoDB connection string URI. Defaults to 'mongodb://localhost:27017'.
            db_name (str): MongoDB database name. Defaults to 'supplysense'.
        """
        self.mongo_uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017")
        self.db_name = db_name or os.getenv("DB_NAME", "supplysense")

        # Establish connection with timeout settings for fail-fast behavior
        self.client: pymongo.MongoClient = pymongo.MongoClient(
            self.mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        self.db = self.client[self.db_name]

        # References to core collections
        self.vendors = self.db["vendors"]
        self.shipments = self.db["shipments"]
        self.emissions = self.db["emissions"]

    def ping(self) -> bool:
        """
        Verify active MongoDB connection.

        Returns:
            bool: True if connection is alive, raises ServerSelectionTimeoutError otherwise.
        """
        self.client.admin.command("ping")
        return True

    def identify_carbon_hotspots(self, threshold_percentile: float = 75.0) -> Dict[str, Any]:
        """
        Identify carbon hotspot vendors whose total emissions exceed a statistical percentile threshold.

        Aggregation Pipeline:
            1. Group emission records by vendor (`$vendor`), summing emission `amount`.
            2. `$lookup` against `vendors` collection to retrieve vendor profile and metadata.
            3. Compute the specified percentile threshold using `np.percentile()`.
            4. Flag vendors exceeding the percentile threshold as carbon hotspots.

        Args:
            threshold_percentile (float): Percentile threshold (0-100) for outlier detection. Defaults to 75.0.

        Returns:
            Dict[str, Any]: Contains:
                - 'threshold_percentile': Percentile cutoff used.
                - 'threshold_value': The computed emission threshold in kg CO2e.
                - 'total_vendors_analyzed': Total count of evaluated vendors.
                - 'hotspots': List of vendors exceeding threshold with details and flagged status.
                - 'all_vendors': Complete ranked list of vendors with hotspot flags.
        """
        pipeline = [
            {
                "$match": {
                    "amount": {"$exists": True, "$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$vendor",
                    "totalEmissions": {"$sum": "$amount"},
                    "recordCount": {"$sum": 1}
                }
            },
            {
                "$lookup": {
                    "from": "vendors",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "vendorInfo"
                }
            },
            {
                "$unwind": {
                    "path": "$vendorInfo",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$project": {
                    "vendorId": "$_id",
                    "vendorName": {
                        "$ifNull": ["$vendorInfo.name", "Unknown Vendor"]
                    },
                    "tier": {"$ifNull": ["$vendorInfo.tier", "Unknown"]},
                    "industry": {"$ifNull": ["$vendorInfo.industry", "Unknown"]},
                    "riskLevel": {"$ifNull": ["$vendorInfo.riskLevel", "Unknown"]},
                    "sustainabilityScore": {"$ifNull": ["$vendorInfo.sustainabilityScore", 0]},
                    "totalEmissions": 1,
                    "recordCount": 1
                }
            },
            {
                "$sort": {"totalEmissions": -1}
            }
        ]

        raw_results = list(self.emissions.aggregate(pipeline))

        if not raw_results:
            return {
                "threshold_percentile": threshold_percentile,
                "threshold_value": 0.0,
                "total_vendors_analyzed": 0,
                "hotspots": [],
                "all_vendors": []
            }

        # Extract emissions array for numpy percentile calculation
        emissions_array = np.array([float(doc.get("totalEmissions", 0)) for doc in raw_results], dtype=float)
        threshold_value = float(np.percentile(emissions_array, threshold_percentile))

        hotspots: List[Dict[str, Any]] = []
        all_vendors: List[Dict[str, Any]] = []

        for doc in raw_results:
            total_em = float(doc.get("totalEmissions", 0))
            is_hotspot = bool(total_em > threshold_value)

            vendor_entry = {
                "vendor_id": str(doc.get("vendorId")),
                "vendor_name": doc.get("vendorName", "Unknown Vendor"),
                "industry": doc.get("industry", "Unknown"),
                "tier": doc.get("tier", "Unknown"),
                "risk_level": doc.get("riskLevel", "Unknown"),
                "sustainability_score": doc.get("sustainabilityScore", 0),
                "total_emissions": round(total_em, 2),
                "record_count": int(doc.get("recordCount", 0)),
                "flagged": is_hotspot,
                "is_hotspot": is_hotspot
            }

            all_vendors.append(vendor_entry)
            if is_hotspot:
                hotspots.append(vendor_entry)

        return {
            "threshold_percentile": threshold_percentile,
            "threshold_value": round(threshold_value, 2),
            "total_vendors_analyzed": len(all_vendors),
            "hotspots": hotspots,
            "all_vendors": all_vendors
        }

    def predict_emission_trends(self, months_ahead: int = 6) -> Dict[str, Any]:
        """
        Forecast emission trends using ordinary least squares linear regression (np.polyfit).

        Aggregation Pipeline:
            1. Group emissions by year and month from `reportingPeriod.startDate` (fallback to `createdAt`).
            2. Calculate monthly aggregate emission sums.
            3. Sort chronologically.

        Analysis:
            - If fewer than 2 monthly points exist, returns an error status.
            - Computes regression line: y = slope * x + intercept.
            - Extrapolates for `months_ahead` periods, clamping negative predictions to 0.

        Args:
            months_ahead (int): Number of future months to forecast. Defaults to 6.

        Returns:
            Dict[str, Any]: Regression parameters, historical data points, and forward predictions.
        """
        pipeline = [
            {
                "$match": {
                    "amount": {"$exists": True, "$ne": None},
                    "$or": [
                        {"reportingPeriod.startDate": {"$exists": True, "$ne": None}},
                        {"createdAt": {"$exists": True, "$ne": None}}
                    ]
                }
            },
            {
                "$project": {
                    "amount": 1,
                    "date": {
                        "$ifNull": ["$reportingPeriod.startDate", "$createdAt"]
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": {"$toDate": "$date"}},
                        "month": {"$month": {"$toDate": "$date"}}
                    },
                    "totalEmissions": {"$sum": "$amount"},
                    "recordCount": {"$sum": 1}
                }
            },
            {
                "$sort": {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]

        historical_records = list(self.emissions.aggregate(pipeline))

        formatted_history: List[Dict[str, Any]] = [
            {
                "period": f"{doc['_id']['year']}-{int(doc['_id']['month']):02d}",
                "year": int(doc["_id"]["year"]),
                "month": int(doc["_id"]["month"]),
                "total_emissions": round(float(doc["totalEmissions"]), 2),
                "record_count": int(doc["recordCount"])
            }
            for doc in historical_records
        ]

        # Require at least 2 distinct data points for linear regression
        if len(formatted_history) < 2:
            return {
                "status": "error",
                "message": (
                    f"Fewer than 2 historical data points found ({len(formatted_history)} available). "
                    "At least 2 distinct months of historical emission data are required for trend forecasting."
                ),
                "historical_data": formatted_history,
                "predictions": [],
                "slope": None,
                "intercept": None
            }

        # Linear regression using numpy polyfit (degree 1)
        x = np.arange(len(formatted_history), dtype=float)
        y = np.array([doc["total_emissions"] for doc in formatted_history], dtype=float)
        slope, intercept = np.polyfit(x, y, 1)

        # Generate future month predictions
        last_year = formatted_history[-1]["year"]
        last_month = formatted_history[-1]["month"]

        predictions: List[Dict[str, Any]] = []
        for step in range(1, months_ahead + 1):
            future_x = (len(formatted_history) - 1) + step
            raw_prediction = float(slope * future_x + intercept)
            clamped_prediction = max(0.0, raw_prediction)

            # Advance month and year
            total_month_idx = (last_year * 12 + last_month - 1) + step
            pred_year = total_month_idx // 12
            pred_month = (total_month_idx % 12) + 1

            predictions.append({
                "period": f"{pred_year}-{pred_month:02d}",
                "year": pred_year,
                "month": pred_month,
                "predicted_emissions": round(clamped_prediction, 2),
                "raw_prediction": round(raw_prediction, 2)
            })

        return {
            "status": "success",
            "slope": round(float(slope), 4),
            "intercept": round(float(intercept), 4),
            "historical_data": formatted_history,
            "predictions": predictions
        }

    def scope3_deep_dive(self) -> Dict[str, Any]:
        """
        Analyze GHG Protocol Scope 3 (value-chain) carbon emissions broken down by category.

        Aggregation Pipeline:
            1. Filter emissions matching `scope == 'Scope 3'`.
            2. Group by category, calculating total emission amounts and record counts.
            3. Sort by total emissions in descending order.
            4. Compute category percentage of aggregate Scope 3 emissions.

        Returns:
            Dict[str, Any]: Total Scope 3 emissions, record counts, and category breakdown.
        """
        pipeline = [
            {
                "$match": {
                    "scope": "Scope 3",
                    "amount": {"$exists": True, "$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$category",
                    "totalEmissions": {"$sum": "$amount"},
                    "recordCount": {"$sum": 1}
                }
            },
            {
                "$sort": {"totalEmissions": -1}
            }
        ]

        results = list(self.emissions.aggregate(pipeline))
        total_scope3 = sum(float(doc.get("totalEmissions", 0)) for doc in results)
        total_records = sum(int(doc.get("recordCount", 0)) for doc in results)

        categories: List[Dict[str, Any]] = []
        for doc in results:
            cat_em = float(doc.get("totalEmissions", 0))
            pct = (cat_em / total_scope3 * 100.0) if total_scope3 > 0 else 0.0

            categories.append({
                "category": doc.get("_id") or "Uncategorized",
                "total_emissions": round(cat_em, 2),
                "record_count": int(doc.get("recordCount", 0)),
                "percentage": round(pct, 2)
            })

        return {
            "total_scope3_emissions": round(total_scope3, 2),
            "total_records": total_records,
            "categories": categories
        }

    def get_vendor_sustainability_report(self) -> List[Dict[str, Any]]:
        """
        Generate a comprehensive sustainability report across all vendors.

        Aggregates emissions across Scope 1, Scope 2, and Scope 3 for each vendor,
        joining vendor metadata (industry, tier, sustainabilityScore, riskLevel),
        and sorts vendors by total emissions in descending order.

        Returns:
            List[Dict[str, Any]]: List of vendor sustainability records.
        """
        pipeline = [
            {
                "$lookup": {
                    "from": "emissions",
                    "localField": "_id",
                    "foreignField": "vendor",
                    "as": "emissions"
                }
            },
            {
                "$project": {
                    "name": 1,
                    "industry": 1,
                    "tier": 1,
                    "sustainabilityScore": 1,
                    "riskLevel": 1,
                    "totalEmissions": {
                        "$sum": "$emissions.amount"
                    },
                    "scope1": {
                        "$sum": {
                            "$map": {
                                "input": {
                                    "$filter": {
                                        "input": "$emissions",
                                        "as": "e",
                                        "cond": {"$eq": ["$$e.scope", "Scope 1"]}
                                    }
                                },
                                "as": "item",
                                "in": "$$item.amount"
                            }
                        }
                    },
                    "scope2": {
                        "$sum": {
                            "$map": {
                                "input": {
                                    "$filter": {
                                        "input": "$emissions",
                                        "as": "e",
                                        "cond": {"$eq": ["$$e.scope", "Scope 2"]}
                                    }
                                },
                                "as": "item",
                                "in": "$$item.amount"
                            }
                        }
                    },
                    "scope3": {
                        "$sum": {
                            "$map": {
                                "input": {
                                    "$filter": {
                                        "input": "$emissions",
                                        "as": "e",
                                        "cond": {"$eq": ["$$e.scope", "Scope 3"]}
                                    }
                                },
                                "as": "item",
                                "in": "$$item.amount"
                            }
                        }
                    },
                    "totalRecords": {"$size": "$emissions"}
                }
            },
            {
                "$sort": {"totalEmissions": -1}
            }
        ]

        # Execute aggregation on vendors collection
        results = list(self.vendors.aggregate(pipeline))

        # Fallback: if vendors collection is empty but emissions has vendor references
        if not results and self.emissions.count_documents({}) > 0:
            em_pipeline = [
                {
                    "$group": {
                        "_id": {
                            "vendor": "$vendor",
                            "scope": "$scope"
                        },
                        "scopeTotal": {"$sum": "$amount"},
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$group": {
                        "_id": "$_id.vendor",
                        "scopes": {
                            "$push": {
                                "scope": "$_id.scope",
                                "total": "$scopeTotal"
                            }
                        },
                        "totalEmissions": {"$sum": "$scopeTotal"},
                        "totalRecords": {"$sum": "$count"}
                    }
                },
                {
                    "$lookup": {
                        "from": "vendors",
                        "localField": "_id",
                        "foreignField": "_id",
                        "as": "vendorInfo"
                    }
                },
                {
                    "$unwind": {
                        "path": "$vendorInfo",
                        "preserveNullAndEmptyArrays": True
                    }
                },
                {"$sort": {"totalEmissions": -1}}
            ]
            em_results = list(self.emissions.aggregate(em_pipeline))
            fallback_report = []
            for doc in em_results:
                vinfo = doc.get("vendorInfo") or {}
                scopes = {s["scope"]: float(s["total"]) for s in doc.get("scopes", [])}
                fallback_report.append({
                    "vendor_id": str(doc["_id"]),
                    "name": vinfo.get("name", "Unknown Vendor"),
                    "industry": vinfo.get("industry", "N/A"),
                    "tier": vinfo.get("tier", "N/A"),
                    "sustainability_score": vinfo.get("sustainabilityScore", 0),
                    "risk_level": vinfo.get("riskLevel", "N/A"),
                    "scope1_emissions": round(scopes.get("Scope 1", 0.0), 2),
                    "scope2_emissions": round(scopes.get("Scope 2", 0.0), 2),
                    "scope3_emissions": round(scopes.get("Scope 3", 0.0), 2),
                    "total_emissions": round(float(doc.get("totalEmissions", 0)), 2),
                    "emission_records_count": int(doc.get("totalRecords", 0))
                })
            return fallback_report

        report: List[Dict[str, Any]] = []
        for doc in results:
            report.append({
                "vendor_id": str(doc.get("_id")),
                "name": doc.get("name", "Unknown Vendor"),
                "industry": doc.get("industry", "N/A"),
                "tier": doc.get("tier", "N/A"),
                "sustainability_score": doc.get("sustainabilityScore", 0),
                "risk_level": doc.get("riskLevel", "N/A"),
                "scope1_emissions": round(float(doc.get("scope1", 0) or 0), 2),
                "scope2_emissions": round(float(doc.get("scope2", 0) or 0), 2),
                "scope3_emissions": round(float(doc.get("scope3", 0) or 0), 2),
                "total_emissions": round(float(doc.get("totalEmissions", 0) or 0), 2),
                "emission_records_count": int(doc.get("totalRecords", 0) or 0)
            })

        return report

    def get_transport_efficiency(self) -> List[Dict[str, Any]]:
        """
        Analyze logistics efficiency and emission intensities by transport mode.

        Aggregation Pipeline:
            1. Group shipments by `transportMode`.
            2. Compute total/avg distance, weight, and carbon emission per mode.
            3. Compute total tonne-kilometres: sum((weight_kg / 1000) * distance_km).
            4. Calculate emission intensity: kg CO2e per tonne-km.
            5. Sort ascending by emission intensity (lower intensity = higher efficiency).

        Returns:
            List[Dict[str, Any]]: Transport mode performance metrics ranked by efficiency.
        """
        pipeline = [
            {
                "$match": {
                    "transportMode": {"$exists": True, "$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$transportMode",
                    "shipmentCount": {"$sum": 1},
                    "totalDistance": {"$sum": "$distance"},
                    "avgDistance": {"$avg": "$distance"},
                    "totalWeight": {"$sum": "$weight"},
                    "avgWeight": {"$avg": "$weight"},
                    "totalCarbon": {"$sum": "$carbonEmission"},
                    "avgCarbon": {"$avg": "$carbonEmission"},
                    "totalTonneKm": {
                        "$sum": {
                            "$multiply": [
                                {"$divide": [{"$ifNull": ["$weight", 0]}, 1000.0]},
                                {"$ifNull": ["$distance", 0]}
                            ]
                        }
                    }
                }
            }
        ]

        raw_results = list(self.shipments.aggregate(pipeline))

        efficiency_list: List[Dict[str, Any]] = []
        for doc in raw_results:
            mode = doc.get("_id") or "Unknown"
            count = int(doc.get("shipmentCount", 0))
            tot_dist = float(doc.get("totalDistance", 0) or 0)
            avg_dist = float(doc.get("avgDistance", 0) or 0)
            tot_weight = float(doc.get("totalWeight", 0) or 0)
            avg_weight = float(doc.get("avgWeight", 0) or 0)
            tot_carbon = float(doc.get("totalCarbon", 0) or 0)
            avg_carbon = float(doc.get("avgCarbon", 0) or 0)
            tot_tkm = float(doc.get("totalTonneKm", 0) or 0)

            # Emission intensity = kg CO2e / (tonne * km)
            intensity = (tot_carbon / tot_tkm) if tot_tkm > 0 else 0.0

            efficiency_list.append({
                "transport_mode": mode,
                "shipment_count": count,
                "total_distance_km": round(tot_dist, 2),
                "avg_distance_km": round(avg_dist, 2),
                "total_weight_kg": round(tot_weight, 2),
                "avg_weight_kg": round(avg_weight, 2),
                "total_carbon_kg": round(tot_carbon, 2),
                "avg_carbon_kg": round(avg_carbon, 2),
                "total_tonne_km": round(tot_tkm, 2),
                "emission_intensity": round(intensity, 4)
            })

        # Sort by efficiency: lowest emission intensity first
        efficiency_list.sort(key=lambda item: item["emission_intensity"])

        # Assign efficiency ranks (1 = most efficient)
        for rank, item in enumerate(efficiency_list, 1):
            item["efficiency_rank"] = rank

        return efficiency_list

    def generate_summary_report(self) -> Dict[str, Any]:
        """
        Execute all analytics routines and aggregate results into a unified summary payload.

        Returns:
            Dict[str, Any]: Comprehensive summary including metadata, hotspots,
            trends, Scope 3 breakdown, vendor reports, and transport efficiency.
        """
        # Metadata and collection counts
        vendor_count = self.vendors.count_documents({})
        shipment_count = self.shipments.count_documents({})
        emission_count = self.emissions.count_documents({})

        metadata = {
            "analysis_date": datetime.now(timezone.utc).isoformat(),
            "database": self.db_name,
            "total_records": {
                "vendors": vendor_count,
                "shipments": shipment_count,
                "emissions": emission_count
            }
        }

        return {
            "metadata": metadata,
            "carbon_hotspots": self.identify_carbon_hotspots(),
            "emission_trends": self.predict_emission_trends(),
            "scope3_deep_dive": self.scope3_deep_dive(),
            "vendor_sustainability_report": self.get_vendor_sustainability_report(),
            "transport_efficiency": self.get_transport_efficiency()
        }

    def close(self) -> None:
        """Close the MongoDB connection client."""
        if hasattr(self, "client") and self.client:
            self.client.close()

    def __enter__(self):
        """Context manager support."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup."""
        self.close()
