# Tableau Guide: Housing Sales Analysis

## Step 1 — Connect Data

1. Open Tableau Desktop
2. On the **Start** page, click **Text File**
3. Navigate to: `housing_sales/data/kc_house_data_prepared.csv`
4. Click **Open**
5. Tableau will auto-detect column types. Verify:
   - `price`, `bedrooms`, `bathrooms`, `sqft_living`, `floors` → **Number**
   - `yr_built`, `yr_renovated` → **Number (Whole)**
   - `date` → **Date**

---

## Step 2 — Create Calculated Fields (7 Fields)

> Go to: **Analysis → Create Calculated Field** (or right-click the Data pane)

### Field 1: house_age
```
2015 - [yr_built]
```
*Description: Number of years since the house was built (as of 2015)*

### Field 2: years_since_renovation
```
IF [yr_renovated] > 0
THEN 2015 - [yr_renovated]
ELSE [house_age]
END
```
*Description: Years since the most recent renovation, or house_age if never renovated*

### Field 3: renovation_status
```
IF [yr_renovated] > 0
THEN "Renovated"
ELSE "Never Renovated"
END
```
*Description: Classifies each property as Renovated or Never Renovated*

### Field 4: price_per_sqft
```
[price] / [sqft_living]
```
*Description: Sale price per square foot of living space*

### Field 5: age_category
```
IF [house_age] < 10
THEN "New (<10 yrs)"
ELSEIF [house_age] < 30
THEN "Mid-age (10–30 yrs)"
ELSEIF [house_age] < 50
THEN "Mature (30–50 yrs)"
ELSE "Old (50+ yrs)"
END
```
*Description: Categorical age buckets for histogram analysis*

### Field 6: bathroom_category
```
IF [bathrooms] <= 1
THEN "1 Bath"
ELSEIF [bathrooms] <= 2
THEN "2 Bath"
ELSE "3+ Bath"
END
```
*Description: Bathroom tier grouping*

### Field 7: bedroom_category
```
IF [bedrooms] <= 2
THEN "1–2 BR"
ELSEIF [bedrooms] = 3
THEN "3 BR"
ELSEIF [bedrooms] = 4
THEN "4 BR"
ELSE "5+ BR"
END
```
*Description: Bedroom tier grouping*

---

## Step 3 — Create 7 Visualizations

### Viz 1: Price by Renovation Status (Bar Chart)
1. New Worksheet → Rename: "Renovation Impact"
2. Drag `renovation_status` → **Columns**
3. Drag `price` → **Rows** → Change to **AVG**
4. Drag `renovation_status` → **Color** (Marks card)
5. Add **price** to **Label** → Format as currency
6. Sort bars by avg price (descending)

### Viz 2: House Age Distribution (Histogram)
1. New Worksheet → Rename: "Age Distribution"
2. Drag `age_category` → **Columns**
3. Drag `price` → **Rows** → Change to **COUNT**
4. Drag `age_category` → **Color** (Marks card)
5. Sort: New → Mid-age → Mature → Old
6. Right-click x-axis → Sort → Manual for custom order

### Viz 3: Years Since Renovation vs Price (Scatter)
1. New Worksheet → Rename: "Renovation Scatter"
2. Drag `years_since_renovation` → **Columns**
3. Drag `price` → **Rows**
4. Change Mark type to **Circle**
5. Drag `price` → **Color** → Use sequential color ramp
6. Drag `price_per_sqft` → **Tooltip**
7. Add **Trend Line**: Analysis → Trend Lines → Show Trend Lines

### Viz 4: Bedrooms vs Avg Price (Bar)
1. New Worksheet → Rename: "Bedroom Impact"
2. Drag `bedrooms` → **Columns** (treat as Dimension)
3. Drag `price` → **Rows** → Change to **AVG**
4. Drag `bedroom_category` → **Color**

### Viz 5: Bathrooms vs Avg Price (Bar)
1. New Worksheet → Rename: "Bathroom Impact"
2. Drag `bathroom_category` → **Columns**
3. Drag `price` → **Rows** → Change to **AVG**
4. Drag `bathroom_category` → **Color**
5. Sort by avg price

### Viz 6: Floors vs Avg Price (Bar)
1. New Worksheet → Rename: "Floor Impact"
2. Drag `floors` → **Columns** (treat as Dimension)
3. Drag `price` → **Rows** → Change to **AVG**
4. Drag `price` → **Color** → Use sequential palette

### Viz 7: Price Trend Over Time (Line)
1. New Worksheet → Rename: "Price Trend"
2. Drag `date` → **Columns** → Right-click → Month (continuous)
3. Drag `price` → **Rows** → Change to **AVG**
4. Drag `COUNT([price])` → **Rows** (second axis) → Dual Axis
5. Change second mark type to **Bar**, reduce opacity
6. Right-click y-axis → **Synchronize Axis**

---

## Step 4 — Build the Dashboard

1. Go to: **Dashboard → New Dashboard**
2. **Set Size**: Choose **Automatic** for responsive layout
   - Or set to 1400 × 900 for a fixed layout
3. **Add Worksheets** by dragging from the left panel:
   - Row 1: Renovation Impact | Age Distribution
   - Row 2: Bedroom Impact | Bathroom Impact | Floor Impact
   - Row 3 (full width): Renovation Scatter
   - Row 4 (full width): Price Trend
4. **Add Filters** (show as dropdown):
   - `renovation_status` — Apply to All Worksheets
   - `bedrooms` — Apply to All Worksheets
   - `floors` — Apply to All Worksheets
   - `price` — Apply to All Worksheets (use Range slider)
5. **Add Title**: "Housing Sales Analytics Dashboard"
6. **Add Filter Action**:
   - Dashboard → Actions → Add Action → Filter
   - Source: All sheets, Target: All sheets
   - Run on: Select

### Device Frames (Responsive Design)
- Dashboard → Device Layouts
- Add **Desktop**, **Tablet**, and **Phone** layouts
- Rearrange charts for each device size

---

## Step 5 — Create Story (Storyboard)

1. Go to: **Story → New Story**
2. **Story Title**: "Housing Sales — From Data to Decisions"
3. **Add 5 Story Points**:

| Point | Caption | Sheet |
|-------|---------|-------|
| 1 | "The Market Landscape — 21,588 Properties, 1 Year" | Price Trend |
| 2 | "Does Renovation Pay? +41% Price Premium" | Renovation Impact |
| 3 | "Age Tells a Story — From New to Century-Old Homes" | Age Distribution |
| 4 | "Room by Room — How Bedrooms &amp; Bathrooms Drive Price" | Bedroom/Bathroom Impact |
| 5 | "Key Takeaways — Actionable Insights for All Stakeholders" | Full Dashboard |

4. **Annotate** each point with a text box description
5. **Add Navigation** style: Dots or Numbers

---

## Step 6 — Publish to Tableau Public

1. Go to: **Server → Tableau Public → Save to Tableau Public As...**
2. Sign in with your Tableau Public account (free at public.tableau.com)
3. Name your workbook: **"Housing Sales Analytics"**
4. Click **Save**
5. After publishing, your browser will open. Copy the URL from the address bar
6. **URL format**: `https://public.tableau.com/views/HousingSalesAnalytics/Dashboard1`

---

## Step 7 — Embed in Flask Web App

1. Navigate to: `http://localhost:5000/tableau` in the running Flask app
2. Paste your Tableau Public URL into the input field
3. Click **"Load Dashboard"** or **"Load Story"**
4. The `<tableau-viz>` web component will render your dashboard live

### Manual HTML Embedding

Add this to any Flask template:

```html
<!-- Load Tableau Embedding API v3 -->
<script type="module"
  src="https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js">
</script>

<!-- Embed the viz -->
<tableau-viz
  id="tableauViz"
  src="https://public.tableau.com/views/YOUR_WORKBOOK/YOUR_DASHBOARD"
  toolbar="bottom"
  hide-tabs>
</tableau-viz>
```

---

## Performance Testing Checklist

| Test | Expected Result | Status |
|------|----------------|--------|
| Renovation filter → all charts update | ✅ All 7 charts reflect filter | |
| Bedrooms filter → bedroom chart updates | ✅ Bar chart shows selected BR | |
| Price range filter → scatter updates | ✅ Points above max hidden | |
| Floors filter → floors chart updates | ✅ Single bar shown | |
| Year built filter → trend updates | ✅ Trend line scoped | |
| 7 calculated fields verified | ✅ All present in prepared CSV | |
| 7 visualizations rendered | ✅ All 7 charts visible | |
| Responsive at 375px | ✅ Mobile layout active | |
| Responsive at 768px | ✅ Tablet layout active | |
| Responsive at 1200px+ | ✅ Desktop layout active | |
| API /api/data returns JSON | ✅ 200 OK with chart data | |
| API /api/kpis returns JSON | ✅ 200 OK with KPI data | |
