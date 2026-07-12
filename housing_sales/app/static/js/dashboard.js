/**
 * Housing Sales Dashboard — Interactive Charts & Filters
 * Uses Plotly.js for all 7 visualizations
 */

'use strict';

// ── Plotly Layout Defaults ──────────────────────────────────────────
const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { color: '#94a3b8', family: 'Inter, system-ui, sans-serif', size: 11 },
  margin: { t: 10, b: 40, l: 55, r: 15 },
  xaxis: {
    gridcolor: 'rgba(148,163,184,0.08)',
    zerolinecolor: 'rgba(148,163,184,0.1)',
    tickfont: { size: 10 },
  },
  yaxis: {
    gridcolor: 'rgba(148,163,184,0.08)',
    zerolinecolor: 'rgba(148,163,184,0.1)',
    tickfont: { size: 10 },
  },
  hoverlabel: {
    bgcolor: '#1e293b',
    bordercolor: 'rgba(148,163,184,0.25)',
    font: { color: '#e2e8f0', size: 12 },
  },
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

// Color palette
const COLORS = {
  blue:   'hsla(212,95%,58%,0.85)',
  purple: 'hsla(252,85%,68%,0.85)',
  green:  'hsla(170,85%,48%,0.85)',
  gold:   'hsla(38,95%,58%,0.85)',
  rose:   'hsla(342,85%,62%,0.85)',
  blue_d: 'hsla(212,95%,58%,0.45)',
};

// ── State ───────────────────────────────────────────────────────────
let RAW_DATA = null;
let ACTIVE_FILTERS = { reno: 'all', beds: 'all', floors: 'all', price: null, year: null };

// ── Boot ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res  = await fetch('/api/data');
    RAW_DATA   = await res.json();
    renderAll(RAW_DATA.charts, RAW_DATA.kpis);
    initRangeDisplays();
    updatePerfBar();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.querySelectorAll('[id^="chart"]').forEach(el => {
      el.innerHTML = '<div style="padding:2rem;color:#94a3b8;text-align:center;">⚠ Data unavailable. Run scripts/prepare_data.py first.</div>';
    });
  }
});

// ── Range display updates ────────────────────────────────────────────
function initRangeDisplays() {
  const priceSlider = document.getElementById('filter-price');
  const yearSlider  = document.getElementById('filter-year');
  const priceDisp   = document.getElementById('price-display');
  const yearDisp    = document.getElementById('year-display');

  if (priceSlider) {
    priceSlider.addEventListener('input', () => {
      priceDisp.textContent = '$' + Number(priceSlider.value).toLocaleString();
    });
  }
  if (yearSlider) {
    yearSlider.addEventListener('input', () => {
      yearDisp.textContent = yearSlider.value;
    });
  }
}

// ── Apply Filters ────────────────────────────────────────────────────
function applyFilters() {
  if (!RAW_DATA) return;

  ACTIVE_FILTERS.reno   = document.getElementById('filter-reno')?.value   || 'all';
  ACTIVE_FILTERS.beds   = document.getElementById('filter-beds')?.value   || 'all';
  ACTIVE_FILTERS.floors = document.getElementById('filter-floors')?.value || 'all';
  ACTIVE_FILTERS.price  = parseFloat(document.getElementById('filter-price')?.value) || null;
  ACTIVE_FILTERS.year   = parseFloat(document.getElementById('filter-year')?.value)  || null;

  // For pre-aggregated data, we apply simple label filtering
  const filtered = applyFilterLogic(RAW_DATA.charts, ACTIVE_FILTERS);
  renderAll(filtered, RAW_DATA.kpis);
  updateFilterBadge();
  updatePerfBar();
}

function applyFilterLogic(charts, filters) {
  // Clone charts to avoid mutating originals
  const c = JSON.parse(JSON.stringify(charts));

  // Filter Chart 1: Renovation Status
  if (filters.reno !== 'all') {
    const idx = c.price_by_renovation.labels.indexOf(filters.reno);
    if (idx !== -1) {
      c.price_by_renovation.labels  = [c.price_by_renovation.labels[idx]];
      c.price_by_renovation.avg_price = [c.price_by_renovation.avg_price[idx]];
      c.price_by_renovation.median_price = [c.price_by_renovation.median_price[idx]];
      c.price_by_renovation.count    = [c.price_by_renovation.count[idx]];
    }
  }

  // Filter Chart 4: Bedrooms
  if (filters.beds !== 'all') {
    const idx = c.bedrooms_vs_price.labels.indexOf(String(parseInt(filters.beds)));
    if (idx !== -1) {
      c.bedrooms_vs_price.labels    = [c.bedrooms_vs_price.labels[idx]];
      c.bedrooms_vs_price.avg_price = [c.bedrooms_vs_price.avg_price[idx]];
      c.bedrooms_vs_price.count     = [c.bedrooms_vs_price.count[idx]];
    }
  }

  // Filter Chart 6: Floors
  if (filters.floors !== 'all') {
    const fl  = String(parseFloat(filters.floors));
    const idx = c.floors_vs_price.labels.indexOf(fl);
    if (idx !== -1) {
      c.floors_vs_price.labels    = [c.floors_vs_price.labels[idx]];
      c.floors_vs_price.avg_price = [c.floors_vs_price.avg_price[idx]];
      c.floors_vs_price.count     = [c.floors_vs_price.count[idx]];
    }
  }

  // Filter Scatter by price
  if (filters.price) {
    const mask = c.renovation_scatter.y.map(v => v <= filters.price);
    c.renovation_scatter.x = c.renovation_scatter.x.filter((_, i) => mask[i]);
    c.renovation_scatter.y = c.renovation_scatter.y.filter((_, i) => mask[i]);
  }

  return c;
}

function resetFilters() {
  document.getElementById('filter-reno').value   = 'all';
  document.getElementById('filter-beds').value   = 'all';
  document.getElementById('filter-floors').value = 'all';

  const priceSlider = document.getElementById('filter-price');
  const yearSlider  = document.getElementById('filter-year');
  if (priceSlider) {
    priceSlider.value = priceSlider.max;
    document.getElementById('price-display').textContent = '$' + Number(priceSlider.max).toLocaleString();
  }
  if (yearSlider) {
    yearSlider.value = yearSlider.min;
    document.getElementById('year-display').textContent = yearSlider.min;
  }

  ACTIVE_FILTERS = { reno: 'all', beds: 'all', floors: 'all', price: null, year: null };
  if (RAW_DATA) renderAll(RAW_DATA.charts, RAW_DATA.kpis);
  updateFilterBadge();
  updatePerfBar();
}

function updateFilterBadge() {
  const active = Object.values(ACTIVE_FILTERS).filter(v => v && v !== 'all').length;
  const badge  = document.getElementById('active-badge');
  if (badge) badge.style.display = active > 0 ? 'inline-flex' : 'none';
}

function updatePerfBar() {
  const active = Object.values(ACTIVE_FILTERS).filter(v => v && v !== 'all').length;
  const bar    = document.getElementById('filter-perf-bar');
  const val    = document.getElementById('filter-perf-val');
  if (bar) bar.style.width = (active / 5 * 100) + '%';
  if (val) val.textContent = `${active} / 5`;
}

// ── Render All 7 Charts ──────────────────────────────────────────────
function renderAll(charts, kpis) {
  renderChart1(charts.price_by_renovation);
  renderChart2(charts.house_age_distribution);
  renderChart3(charts.renovation_scatter);
  renderChart4(charts.bedrooms_vs_price);
  renderChart5(charts.bathrooms_vs_price);
  renderChart6(charts.floors_vs_price);
  renderChart7(charts.price_trend);
  updateKPIs(kpis);
}

// ── Chart 1: Avg Price by Renovation Status ──────────────────────────
function renderChart1(data) {
  const colors = data.labels.map(l =>
    l === 'Renovated' ? COLORS.green : COLORS.purple
  );
  Plotly.react('chart1', [{
    type: 'bar',
    x: data.labels,
    y: data.avg_price,
    marker: { color: colors, line: { width: 0 } },
    text: data.avg_price.map(v => '$' + (v/1000).toFixed(0) + 'K'),
    textposition: 'outside',
    textfont: { color: '#e2e8f0', size: 12, family: 'Outfit' },
    hovertemplate: '<b>%{x}</b><br>Avg: $%{y:,.0f}<br>Count: ' +
      data.count?.map((c,i) => data.count[i]).join('|') +
      '<extra></extra>',
    customdata: data.count,
    hovertemplate: '<b>%{x}</b><br>Avg Price: $%{y:,.0f}<br>Properties: %{customdata:,}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
  }, PLOTLY_CONFIG);
}

// ── Chart 2: House Age Distribution ─────────────────────────────────
function renderChart2(data) {
  Plotly.react('chart2', [{
    type: 'bar',
    x: data.labels,
    y: data.count,
    marker: {
      color: [COLORS.green, COLORS.blue, COLORS.purple, COLORS.gold],
      line: { width: 0 }
    },
    hovertemplate: '<b>%{x}</b><br>Properties: %{y:,}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickformat: ',d' },
  }, PLOTLY_CONFIG);
}

// ── Chart 3: Scatter — Years Since Renovation vs Price ───────────────
function renderChart3(data) {
  const n = data.x.length;
  Plotly.react('chart3', [{
    type: 'scatter',
    mode: 'markers',
    x: data.x,
    y: data.y,
    marker: {
      color: data.y,
      colorscale: [
        [0,   'hsla(212,95%,58%,0.6)'],
        [0.5, 'hsla(252,85%,68%,0.7)'],
        [1,   'hsla(342,85%,62%,0.8)'],
      ],
      size: 6,
      line: { width: 0 },
      showscale: true,
      colorbar: {
        title: 'Price ($)',
        tickprefix: '$',
        tickformat: ',.0s',
        thickness: 12,
        len: 0.8,
        tickfont: { color: '#94a3b8', size: 9 },
        titlefont: { color: '#94a3b8', size: 9 },
      }
    },
    hovertemplate: 'Years since reno: <b>%{x}</b><br>Price: <b>$%{y:,.0f}</b><extra></extra>',
  }], {
    ...BASE_LAYOUT,
    margin: { t: 10, b: 45, l: 65, r: 70 },
    xaxis: {
      ...BASE_LAYOUT.xaxis,
      title: { text: 'Years Since Renovation', font: { color: '#64748b', size: 11 } },
    },
    yaxis: {
      ...BASE_LAYOUT.yaxis,
      tickprefix: '$', tickformat: ',.0s',
      title: { text: 'Sale Price', font: { color: '#64748b', size: 11 } },
    },
  }, PLOTLY_CONFIG);
}

// ── Chart 4: Bedrooms vs Avg Price ───────────────────────────────────
function renderChart4(data) {
  Plotly.react('chart4', [{
    type: 'bar',
    x: data.labels.map(v => v + ' BR'),
    y: data.avg_price,
    marker: {
      color: data.avg_price.map((_, i) => {
        const palette = [COLORS.blue, COLORS.purple, COLORS.green, COLORS.gold, COLORS.rose];
        return palette[i % palette.length];
      }),
      line: { width: 0 },
    },
    hovertemplate: '<b>%{x}</b><br>Avg Price: $%{y:,.0f}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
  }, PLOTLY_CONFIG);
}

// ── Chart 5: Bathrooms vs Avg Price ─────────────────────────────────
function renderChart5(data) {
  Plotly.react('chart5', [{
    type: 'bar',
    x: data.labels,
    y: data.avg_price,
    marker: { color: [COLORS.blue, COLORS.green, COLORS.gold], line: { width: 0 } },
    hovertemplate: '<b>%{x}</b><br>Avg Price: $%{y:,.0f}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
  }, PLOTLY_CONFIG);
}

// ── Chart 6: Floors vs Avg Price ─────────────────────────────────────
function renderChart6(data) {
  Plotly.react('chart6', [{
    type: 'bar',
    x: data.labels.map(v => v + ' fl'),
    y: data.avg_price,
    marker: { color: COLORS.purple, line: { width: 0 } },
    hovertemplate: '<b>%{x}</b><br>Avg Price: $%{y:,.0f}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
  }, PLOTLY_CONFIG);
}

// ── Chart 7: Price Trend Over Time ───────────────────────────────────
function renderChart7(data) {
  if (!data.labels || data.labels.length === 0) {
    document.getElementById('chart7').innerHTML =
      '<div class="chart-loading"><span>📊</span> Monthly trend data not available</div>';
    return;
  }

  Plotly.react('chart7', [
    {
      type: 'scatter', mode: 'lines+markers',
      name: 'Avg Price',
      x: data.labels, y: data.avg_price,
      line: { color: COLORS.blue, width: 2.5, shape: 'spline' },
      marker: { color: COLORS.blue, size: 7, line: { color: '#1e293b', width: 1.5 } },
      hovertemplate: '<b>%{x}</b><br>Avg Price: $%{y:,.0f}<extra></extra>',
      yaxis: 'y',
    },
    {
      type: 'bar', name: 'Sales Volume',
      x: data.labels, y: data.sales_count,
      marker: { color: 'hsla(252,85%,68%,0.25)', line: { width: 0 } },
      hovertemplate: '<b>%{x}</b><br>Sales: %{y:,}<extra></extra>',
      yaxis: 'y2',
    }
  ], {
    ...BASE_LAYOUT,
    margin: { t: 10, b: 45, l: 65, r: 65 },
    legend: {
      x: 0.01, y: 0.99,
      bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#94a3b8', size: 10 },
    },
    yaxis: {
      ...BASE_LAYOUT.yaxis,
      tickprefix: '$', tickformat: ',.0s',
      title: { text: 'Avg Price', font: { color: '#64748b', size: 10 } },
    },
    yaxis2: {
      gridcolor: 'rgba(0,0,0,0)',
      overlaying: 'y', side: 'right',
      tickfont: { color: '#64748b', size: 9 },
      title: { text: 'Sales Volume', font: { color: '#64748b', size: 10 } },
    },
  }, PLOTLY_CONFIG);
}

// ── KPI Updates ──────────────────────────────────────────────────────
function updateKPIs(kpis) {
  if (!kpis) return;
  const fmt = (v, pre='$', suf='K') =>
    pre + (v/1000).toFixed(0) + suf;

  setEl('kpi-avg-price', fmt(kpis.avg_price));
  setEl('kpi-reno-pct',  kpis.pct_renovated + '%');
  setEl('kpi-avg-age',   kpis.avg_house_age + ' yrs');
  setEl('kpi-ppsf',      '$' + kpis.avg_price_per_sqft);
  setEl('record-count',  `Showing ${kpis.total_records.toLocaleString()} properties`);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
