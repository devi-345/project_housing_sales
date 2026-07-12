#!/usr/bin/env python3
"""
Housing Sales Analysis — Data Preparation Script
Creates 7 calculated fields and outputs prepared CSV + JSON for the Flask app.
"""

import os
import json
import math
import pandas as pd
import numpy as np

RAW_PATH  = os.path.join(os.path.dirname(__file__), "..", "data", "kc_house_data.csv")
PREP_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "kc_house_data_prepared.csv")
JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "static", "data", "housing_data.json")

REFERENCE_YEAR = 2015

# ─────────────────────────────────────────────
# STEP 1: Load
# ─────────────────────────────────────────────
def load_data(path):
    df = pd.read_csv(path)
    print(f"[✓] Loaded {len(df):,} rows, {df.shape[1]} columns")

    # Handle NaN rows from IBM version
    df = df.dropna(subset=["price", "bedrooms", "bathrooms"])
    df["bedrooms"]  = pd.to_numeric(df["bedrooms"],  errors="coerce").fillna(0).astype(int)
    df["bathrooms"] = pd.to_numeric(df["bathrooms"], errors="coerce").fillna(0)
    df["yr_built"]  = pd.to_numeric(df["yr_built"],  errors="coerce").fillna(1960).astype(int)
    df["yr_renovated"] = pd.to_numeric(df["yr_renovated"], errors="coerce").fillna(0).astype(int)
    df["floors"]    = pd.to_numeric(df["floors"],    errors="coerce").fillna(1)
    df["price"]     = pd.to_numeric(df["price"],     errors="coerce")
    df["sqft_living"] = pd.to_numeric(df["sqft_living"], errors="coerce").fillna(1000)

    # Remove extreme outliers
    df = df[(df["price"] > 50000) & (df["price"] < 5_000_000)]
    df = df[(df["bedrooms"] > 0) & (df["bedrooms"] <= 10)]

    # Parse date
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], format="%Y%m%dT%H%M%S", errors="coerce")
        df["sale_month"] = df["date"].dt.to_period("M").astype(str)
    else:
        df["sale_month"] = "2014-05"

    print(f"[✓] After cleaning: {len(df):,} rows")
    return df

# ─────────────────────────────────────────────
# STEP 2: Calculated Fields (7)
# ─────────────────────────────────────────────
def add_calculated_fields(df):
    """
    Calculated Field 1: house_age
      The number of years since the house was built (as of 2015).
      Tableau Formula: [Reference Year] - [yr_built]
    """
    df["house_age"] = REFERENCE_YEAR - df["yr_built"]

    """
    Calculated Field 2: years_since_renovation
      How many years ago the property was last renovated.
      If never renovated, use house_age instead.
      Tableau Formula: IF [yr_renovated] > 0
                       THEN [Reference Year] - [yr_renovated]
                       ELSE [house_age] END
    """
    df["years_since_renovation"] = np.where(
        df["yr_renovated"] > 0,
        REFERENCE_YEAR - df["yr_renovated"],
        df["house_age"]
    )

    """
    Calculated Field 3: renovation_status
      Classifies properties as Renovated or Never Renovated.
      Tableau Formula: IF [yr_renovated] > 0 THEN "Renovated" ELSE "Never Renovated" END
    """
    df["renovation_status"] = np.where(df["yr_renovated"] > 0, "Renovated", "Never Renovated")

    """
    Calculated Field 4: price_per_sqft
      The price per square foot of living space.
      Tableau Formula: [price] / [sqft_living]
    """
    df["price_per_sqft"] = (df["price"] / df["sqft_living"]).round(2)

    """
    Calculated Field 5: age_category
      Groups houses into age buckets for histogram analysis.
      Tableau Formula: IF [house_age] < 10 THEN "New (<10 yrs)"
                       ELSEIF [house_age] < 30 THEN "Mid-age (10–30 yrs)"
                       ELSEIF [house_age] < 50 THEN "Mature (30–50 yrs)"
                       ELSE "Old (50+ yrs)" END
    """
    def age_cat(age):
        if age < 10:   return "New (<10 yrs)"
        elif age < 30: return "Mid-age (10–30 yrs)"
        elif age < 50: return "Mature (30–50 yrs)"
        else:          return "Old (50+ yrs)"
    df["age_category"] = df["house_age"].apply(age_cat)

    """
    Calculated Field 6: bathroom_category
      Groups bathrooms into tiers for comparison.
      Tableau Formula: IF [bathrooms] <= 1 THEN "1 Bath"
                       ELSEIF [bathrooms] <= 2 THEN "2 Bath"
                       ELSE "3+ Bath" END
    """
    def bath_cat(b):
        if b <= 1:  return "1 Bath"
        elif b <= 2: return "2 Bath"
        else:        return "3+ Bath"
    df["bathroom_category"] = df["bathrooms"].apply(bath_cat)

    """
    Calculated Field 7: bedroom_category
      Groups bedrooms into tiers.
      Tableau Formula: IF [bedrooms] <= 2 THEN "1–2 BR"
                       ELSEIF [bedrooms] = 3 THEN "3 BR"
                       ELSEIF [bedrooms] = 4 THEN "4 BR"
                       ELSE "5+ BR" END
    """
    def br_cat(b):
        if b <= 2:   return "1–2 BR"
        elif b == 3: return "3 BR"
        elif b == 4: return "4 BR"
        else:        return "5+ BR"
    df["bedroom_category"] = df["bedrooms"].apply(br_cat)

    print("[✓] 7 calculated fields added")
    return df

# ─────────────────────────────────────────────
# STEP 3: Aggregate chart data
# ─────────────────────────────────────────────
def build_chart_data(df):
    charts = {}

    # Chart 1: Price by Renovation Status (Bar)
    reno = df.groupby("renovation_status")["price"].agg(["mean", "median", "count"]).reset_index()
    charts["price_by_renovation"] = {
        "labels": reno["renovation_status"].tolist(),
        "avg_price": [round(v) for v in reno["mean"].tolist()],
        "median_price": [round(v) for v in reno["median"].tolist()],
        "count": reno["count"].tolist(),
    }

    # Chart 2: House Age Distribution (Histogram)
    age_order = ["New (<10 yrs)", "Mid-age (10–30 yrs)", "Mature (30–50 yrs)", "Old (50+ yrs)"]
    age_dist = df.groupby("age_category").agg(
        count=("price", "count"),
        avg_price=("price", "mean")
    ).reindex(age_order).reset_index()
    charts["house_age_distribution"] = {
        "labels": age_dist["age_category"].tolist(),
        "count": age_dist["count"].fillna(0).astype(int).tolist(),
        "avg_price": [round(v) for v in age_dist["avg_price"].fillna(0).tolist()],
    }

    # Chart 3: Years Since Renovation vs Price (Scatter — sample 800 pts)
    scatter_df = df[df["yr_renovated"] > 0][["years_since_renovation", "price", "renovation_status"]].copy()
    if len(scatter_df) > 800:
        scatter_df = scatter_df.sample(800, random_state=42)
    charts["renovation_scatter"] = {
        "x": scatter_df["years_since_renovation"].tolist(),
        "y": scatter_df["price"].tolist(),
    }

    # Chart 4: Bedrooms vs Avg Price (Bar)
    br = df[df["bedrooms"] <= 8].groupby("bedrooms")["price"].agg(["mean", "count"]).reset_index()
    charts["bedrooms_vs_price"] = {
        "labels": [str(int(v)) for v in br["bedrooms"].tolist()],
        "avg_price": [round(v) for v in br["mean"].tolist()],
        "count": br["count"].tolist(),
    }

    # Chart 5: Bathrooms vs Avg Price (Bar)
    bath_order = ["1 Bath", "2 Bath", "3+ Bath"]
    ba = df.groupby("bathroom_category")["price"].agg(["mean", "count"]).reindex(bath_order).reset_index()
    charts["bathrooms_vs_price"] = {
        "labels": ba["bathroom_category"].tolist(),
        "avg_price": [round(v) for v in ba["mean"].fillna(0).tolist()],
        "count": ba["count"].fillna(0).astype(int).tolist(),
    }

    # Chart 6: Floors vs Avg Price (Bar)
    fl = df.groupby("floors")["price"].agg(["mean", "count"]).reset_index()
    fl = fl.sort_values("floors")
    charts["floors_vs_price"] = {
        "labels": [str(v) for v in fl["floors"].tolist()],
        "avg_price": [round(v) for v in fl["mean"].tolist()],
        "count": fl["count"].tolist(),
    }

    # Chart 7: Price Trend Over Time (Line — monthly avg)
    if "sale_month" in df.columns and df["sale_month"].nunique() > 1:
        trend = df.groupby("sale_month")["price"].agg(["mean", "count"]).reset_index().sort_values("sale_month")
        charts["price_trend"] = {
            "labels": trend["sale_month"].tolist(),
            "avg_price": [round(v) for v in trend["mean"].tolist()],
            "sales_count": trend["count"].tolist(),
        }
    else:
        charts["price_trend"] = {"labels": [], "avg_price": [], "sales_count": []}

    return charts

# ─────────────────────────────────────────────
# STEP 4: Summary KPIs
# ─────────────────────────────────────────────
def build_kpis(df):
    renovated = df[df["renovation_status"] == "Renovated"]["price"].mean()
    not_renovated = df[df["renovation_status"] == "Never Renovated"]["price"].mean()
    reno_premium = ((renovated - not_renovated) / not_renovated * 100) if not_renovated else 0

    return {
        "total_records": len(df),
        "avg_price": round(df["price"].mean()),
        "median_price": round(df["price"].median()),
        "avg_house_age": round(df["house_age"].mean(), 1),
        "pct_renovated": round((df["renovation_status"] == "Renovated").mean() * 100, 1),
        "renovation_price_premium_pct": round(reno_premium, 1),
        "avg_price_per_sqft": round(df["price_per_sqft"].mean(), 2),
        "price_range": {
            "min": int(df["price"].min()),
            "max": int(df["price"].max()),
        }
    }

# ─────────────────────────────────────────────
# STEP 5: Filter support data
# ─────────────────────────────────────────────
def build_filter_options(df):
    return {
        "bedroom_options": sorted(df["bedrooms"].unique().tolist()),
        "renovation_options": df["renovation_status"].unique().tolist(),
        "price_min": int(df["price"].min()),
        "price_max": int(df["price"].max()),
        "year_built_min": int(df["yr_built"].min()),
        "year_built_max": int(df["yr_built"].max()),
        "floor_options": sorted(df["floors"].unique().tolist()),
    }

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  Housing Sales — Data Preparation")
    print("=" * 55)

    df = load_data(os.path.abspath(RAW_PATH))
    df = add_calculated_fields(df)

    # Save prepared CSV
    prep_path = os.path.abspath(PREP_PATH)
    df.to_csv(prep_path, index=False)
    print(f"[✓] Prepared CSV saved: {prep_path}")

    # Build JSON payload
    output = {
        "kpis": build_kpis(df),
        "filters": build_filter_options(df),
        "charts": build_chart_data(df),
    }

    json_path = os.path.abspath(JSON_PATH)
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    with open(json_path, "w") as f:
        json.dump(output, f, allow_nan=False)
    print(f"[✓] Chart data JSON saved: {json_path}")
    print(f"\n[✓] KPIs Summary:")
    for k, v in output["kpis"].items():
        print(f"    {k}: {v}")
    print("\n[✓] Data preparation complete!")

if __name__ == "__main__":
    main()
