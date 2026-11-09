#!/usr/bin/env python3
"""
SupplySense - Carbon Analytics CLI Runner
=========================================
Command-line tool to run all supply chain carbon emission analytics routines
and display formatted, publication-grade tables in the terminal.
"""

import sys
import os
import argparse
from typing import List, Dict, Any

# Ensure local analytics module can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False

try:
    from carbon_analytics import CarbonAnalytics
    from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install requirements: pip install -r requirements.txt")
    sys.exit(1)


def format_table(rows: List[List[Any]], headers: List[str], tablefmt: str = "grid") -> str:
    """
    Format rows into a styled table, falling back to basic formatting if tabulate is unavailable.
    """
    if HAS_TABULATE:
        return tabulate(rows, headers=headers, tablefmt=tablefmt)
    
    # Fallback basic column formatter
    col_widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            col_widths[idx] = max(col_widths[idx], len(str(val)))

    header_str = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    separator = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    row_strs = [" | ".join(str(val).ljust(col_widths[i]) for i, val in enumerate(row)) for row in rows]
    return f"{header_str}\n{separator}\n" + "\n".join(row_strs)


def print_banner(db_name: str, mongo_uri: str) -> None:
    """Print ASCII header banner."""
    print("=" * 80)
    print(" 🌍  SUPPLYSENSE — SUPPLY CHAIN CARBON EMISSION ANALYTICS ENGINE")
    print("=" * 80)
    print(f" Connecting to: {mongo_uri}")
    print(f" Database:      {db_name}")
    print("=" * 80)


def run_hotspots_section(analytics: CarbonAnalytics, threshold_percentile: float) -> None:
    """Print Carbon Hotspots analysis."""
    print("\n" + "─" * 80)
    print(f"📍 SECTION 1: CARBON HOTSPOT IDENTIFICATION ({threshold_percentile}th Percentile Threshold)")
    print("─" * 80)

    result = analytics.identify_carbon_hotspots(threshold_percentile=threshold_percentile)
    threshold = result["threshold_value"]
    total_evaluated = result["total_vendors_analyzed"]
    hotspots = result["hotspots"]

    print(f"Threshold Percentile:    {result['threshold_percentile']}%")
    print(f"Cutoff Threshold Value:  {threshold:,.2f} kg CO2e")
    print(f"Total Vendors Evaluated: {total_evaluated}")
    print(f"Hotspot Vendors Flagged: {len(hotspots)}")
    print()

    if not result.get("all_vendors"):
        print("  ℹ️  No vendor emission records found in database.")
        return

    table_data = []
    for v in result["all_vendors"]:
        flag_icon = "🚨 HOTSPOT" if v["is_hotspot"] else "✅ OK"
        table_data.append([
            v["vendor_name"],
            v["industry"],
            v["tier"],
            v["risk_level"],
            f"{v['total_emissions']:,.2f}",
            v["record_count"],
            flag_icon
        ])

    headers = ["Vendor Name", "Industry", "Tier", "Risk Level", "Total (kg CO2e)", "Records", "Status"]
    print(format_table(table_data, headers=headers))


def run_trends_section(analytics: CarbonAnalytics, months_ahead: int) -> None:
    """Print Emission Trend Forecasting analysis."""
    print("\n" + "─" * 80)
    print(f"📈 SECTION 2: EMISSION TREND FORECASTING ({months_ahead}-Month Linear Regression)")
    print("─" * 80)

    trend_result = analytics.predict_emission_trends(months_ahead=months_ahead)

    if trend_result.get("status") == "error":
        print(f"  ⚠️  Notice: {trend_result.get('message')}")
        if trend_result.get("historical_data"):
            print("\n  Historical Data Available:")
            hist_rows = [
                [d["period"], f"{d['total_emissions']:,.2f}", d["record_count"]]
                for d in trend_result["historical_data"]
            ]
            print(format_table(hist_rows, headers=["Period", "Emissions (kg CO2e)", "Records"]))
        return

    slope = trend_result["slope"]
    intercept = trend_result["intercept"]
    direction = "increasing" if slope > 0 else ("decreasing" if slope < 0 else "flat")

    print(f"Regression Formula:   y = {slope:,.4f} * x + {intercept:,.4f}")
    print(f"Monthly Trend:        {slope:+,.2f} kg CO2e/month ({direction})")
    print()

    # Historical Data Table
    print("Historical Monthly Emissions:")
    hist_table = [
        [d["period"], d["year"], d["month"], f"{d['total_emissions']:,.2f}", d["record_count"]]
        for d in trend_result["historical_data"]
    ]
    print(format_table(hist_table, headers=["Period", "Year", "Month", "Emissions (kg CO2e)", "Records"]))

    # Predictions Table
    print(f"\nForward Predictions (Next {months_ahead} Months):")
    pred_table = [
        [
            p["period"],
            p["year"],
            p["month"],
            f"{p['predicted_emissions']:,.2f}",
            f"{p['raw_prediction']:,.2f}"
        ]
        for p in trend_result["predictions"]
    ]
    print(format_table(pred_table, headers=["Period", "Year", "Month", "Predicted CO2e (kg)", "Raw Regression"]))


def run_scope3_section(analytics: CarbonAnalytics) -> None:
    """Print Scope 3 breakdown analysis."""
    print("\n" + "─" * 80)
    print("🌿 SECTION 3: GHG PROTOCOL SCOPE 3 VALUE-CHAIN DEEP DIVE")
    print("─" * 80)

    scope3_data = analytics.scope3_deep_dive()
    total_scope3 = scope3_data["total_scope3_emissions"]
    total_records = scope3_data["total_records"]
    categories = scope3_data["categories"]

    print(f"Total Scope 3 Emissions: {total_scope3:,.2f} kg CO2e")
    print(f"Total Scope 3 Records:   {total_records}")
    print()

    if not categories:
        print("  ℹ️  No Scope 3 emission records found.")
        return

    table_data = []
    for cat in categories:
        pct_bar = f"{cat['percentage']:.1f}%"
        table_data.append([
            cat["category"],
            f"{cat['total_emissions']:,.2f}",
            cat["record_count"],
            pct_bar
        ])

    headers = ["Scope 3 Category", "Emissions (kg CO2e)", "Records", "Share (%)"]
    print(format_table(table_data, headers=headers))


def run_vendor_report_section(analytics: CarbonAnalytics) -> None:
    """Print Comprehensive Vendor Sustainability Report."""
    print("\n" + "─" * 80)
    print("🏢 SECTION 4: VENDOR SUSTAINABILITY & SCOPE BREAKDOWN REPORT")
    print("─" * 80)

    vendor_report = analytics.get_vendor_sustainability_report()

    if not vendor_report:
        print("  ℹ️  No vendor records found.")
        return

    table_data = []
    for v in vendor_report:
        table_data.append([
            v["name"],
            v["industry"],
            v["tier"],
            f"{v['sustainability_score']}/100",
            v["risk_level"],
            f"{v['scope1_emissions']:,.2f}",
            f"{v['scope2_emissions']:,.2f}",
            f"{v['scope3_emissions']:,.2f}",
            f"{v['total_emissions']:,.2f}"
        ])

    headers = [
        "Vendor Name",
        "Industry",
        "Tier",
        "Score",
        "Risk",
        "Scope 1 (kg)",
        "Scope 2 (kg)",
        "Scope 3 (kg)",
        "Total (kg CO2e)"
    ]
    print(format_table(table_data, headers=headers))


def run_transport_section(analytics: CarbonAnalytics) -> None:
    """Print Transport Mode Efficiency Analysis."""
    print("\n" + "─" * 80)
    print("🚢 SECTION 5: LOGISTICS & TRANSPORT MODE EFFICIENCY")
    print("─" * 80)

    efficiency_data = analytics.get_transport_efficiency()

    if not efficiency_data:
        print("  ℹ️  No shipment records found.")
        return

    table_data = []
    for item in efficiency_data:
        table_data.append([
            f"#{item['efficiency_rank']}",
            item["transport_mode"],
            item["shipment_count"],
            f"{item['total_distance_km']:,.1f}",
            f"{item['total_weight_kg']:,.1f}",
            f"{item['total_tonne_km']:,.1f}",
            f"{item['total_carbon_kg']:,.2f}",
            f"{item['emission_intensity']:.4f}"
        ])

    headers = [
        "Rank",
        "Mode",
        "Shipments",
        "Total Dist (km)",
        "Total Weight (kg)",
        "Tonne-km",
        "Carbon (kg CO2e)",
        "Intensity (kg/t-km)"
    ]
    print(format_table(table_data, headers=headers))
    print("\n* Note: Emission intensity = kg CO2e / tonne-km. Lower intensity = higher carbon efficiency.")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="SupplySense Carbon Emission Analytics Engine CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        help="MongoDB connection URI"
    )
    parser.add_argument(
        "--db-name",
        default=os.getenv("DB_NAME", "supplysense"),
        help="MongoDB database name"
    )
    parser.add_argument(
        "--hotspot-percentile",
        type=float,
        default=75.0,
        help="Percentile threshold for carbon hotspot detection"
    )
    parser.add_argument(
        "--months-ahead",
        type=int,
        default=6,
        help="Number of future months to forecast"
    )

    args = parser.parse_args()

    print_banner(db_name=args.db_name, mongo_uri=args.mongo_uri)

    analytics = None
    try:
        analytics = CarbonAnalytics(mongo_uri=args.mongo_uri, db_name=args.db_name)
        # Check connection before starting
        analytics.ping()
        print("✅ Successfully connected to MongoDB.\n")
    except (ServerSelectionTimeoutError, ConnectionFailure) as e:
        print(f"\n❌ Connection Error: Unable to connect to MongoDB at '{args.mongo_uri}'.")
        print(f"   Details: {e}")
        print("\nTroubleshooting tips:")
        print("  1. Verify MongoDB is running locally: `sudo systemctl status mongod` or `docker compose up -d mongo`")
        print("  2. Ensure the port 27017 is open and accessible.")
        print("  3. Pass a custom connection string using: --mongo-uri mongodb://<host>:<port>")
        sys.exit(1)
    except PyMongoError as e:
        print(f"\n❌ PyMongo Database Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected Error during initialization: {e}")
        sys.exit(1)

    try:
        # Run all analytical sections
        run_hotspots_section(analytics, threshold_percentile=args.hotspot_percentile)
        run_trends_section(analytics, months_ahead=args.months_ahead)
        run_scope3_section(analytics)
        run_vendor_report_section(analytics)
        run_transport_section(analytics)

        print("\n" + "=" * 80)
        print(" 🎯  Analytics run completed successfully.")
        print("=" * 80 + "\n")
    except PyMongoError as e:
        print(f"\n❌ Database error during analytics execution: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Execution error: {e}")
        sys.exit(1)
    finally:
        if analytics:
            analytics.close()


if __name__ == "__main__":
    main()
