#!/usr/bin/env python3
"""
Housing Sales Analysis — Flask Application
Routes: / | /dashboard | /storyboard | /about | /api/data | /tableau
"""

import os
import json
from flask import Flask, render_template, jsonify, request, abort

app = Flask(__name__)
app.secret_key = "housing-sales-2024"

DATA_PATH = os.path.join(os.path.dirname(__file__), "static", "data", "housing_data.json")

def load_data():
    """Load pre-aggregated chart data."""
    if not os.path.exists(DATA_PATH):
        return None
    with open(DATA_PATH) as f:
        return json.load(f)

# ─────────────────────────────────────────────
# Page Routes
# ─────────────────────────────────────────────
@app.route("/")
def index():
    data = load_data()
    kpis = data["kpis"] if data else {}
    return render_template("index.html", kpis=kpis)

@app.route("/dashboard")
def dashboard():
    data = load_data()
    filters = data["filters"] if data else {}
    return render_template("dashboard.html", filters=filters)

@app.route("/storyboard")
def storyboard():
    return render_template("storyboard.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/tableau")
def tableau():
    return render_template("tableau.html")

# ─────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────
@app.route("/api/data")
def api_data():
    """Return full pre-aggregated chart data."""
    data = load_data()
    if not data:
        abort(503, description="Data not prepared yet. Run scripts/prepare_data.py first.")
    return jsonify(data)

@app.route("/api/kpis")
def api_kpis():
    data = load_data()
    if not data:
        abort(503)
    return jsonify(data["kpis"])

# ─────────────────────────────────────────────
# Error Handlers
# ─────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return render_template("index.html", error="Page not found"), 404

@app.errorhandler(503)
def service_unavailable(e):
    return jsonify({"error": str(e)}), 503

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5050)
