/**
 * Storyboard — Slide navigation and embedded Plotly charts
 */

'use strict';

const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 10 },
  margin: { t: 10, b: 40, l: 55, r: 15 },
  xaxis: { gridcolor: 'rgba(148,163,184,0.08)', zerolinecolor: 'rgba(148,163,184,0.1)' },
  yaxis: { gridcolor: 'rgba(148,163,184,0.08)', zerolinecolor: 'rgba(148,163,184,0.1)' },
  hoverlabel: { bgcolor: '#1e293b', bordercolor: 'rgba(148,163,184,0.25)', font: { color: '#e2e8f0', size: 12 } },
};
const CFG = { responsive: true, displayModeBar: false };

let currentSlide = 0;
const TOTAL = 5;
let DATA = null;

// ── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/data');
    DATA = (await res.json()).charts;
  } catch (e) {
    console.warn('Could not load chart data', e);
  }

  initSlides();
  goToSlide(0);
});

function initSlides() {
  // Intersection Observer for scroll-trigger animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        renderSlideChart(e.target.id);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.slide').forEach(s => observer.observe(s));
}

// ── Slide Nav ────────────────────────────────────────────────────────
function goToSlide(idx) {
  if (idx < 0 || idx >= TOTAL) return;
  currentSlide = idx;

  // Scroll to slide
  const slide = document.getElementById('slide-' + idx);
  if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'start' });

  updateNav();
}

function nextSlide() { goToSlide(currentSlide + 1); }
function prevSlide() { goToSlide(currentSlide - 1); }

function updateNav() {
  // Dots
  document.querySelectorAll('.story-nav-dot').forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });

  // Progress bar
  const pct = ((currentSlide + 1) / TOTAL) * 100;
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = pct + '%';

  // Counter
  const ctr = document.getElementById('slide-counter');
  if (ctr) ctr.textContent = (currentSlide + 1) + ' / ' + TOTAL;

  // Prev/next buttons
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.disabled = currentSlide === 0;
  if (next) next.textContent = currentSlide === TOTAL - 1 ? '↩ Back to Start' : 'Next →';
  if (next) next.onclick = currentSlide === TOTAL - 1 ? () => goToSlide(0) : nextSlide;
}

// Scroll-spy to update currentSlide as user scrolls
const slides = document.querySelectorAll('.slide');
window.addEventListener('scroll', () => {
  slides.forEach((s, i) => {
    const rect = s.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.4 && rect.bottom > 0) {
      if (currentSlide !== i) {
        currentSlide = i;
        updateNav();
      }
    }
  });
}, { passive: true });

// ── Slide Chart Renderers ─────────────────────────────────────────────
const rendered = new Set();

function renderSlideChart(slideId) {
  if (!DATA || rendered.has(slideId)) return;
  rendered.add(slideId);

  if (slideId === 'slide-0') renderS1();
  if (slideId === 'slide-1') renderS2();
  if (slideId === 'slide-2') renderS3();
  if (slideId === 'slide-3') renderS4();
}

// S1: Price Trend
function renderS1() {
  const d = DATA.price_trend;
  if (!d || !d.labels.length) return;
  Plotly.newPlot('s1-chart', [
    {
      type: 'scatter', mode: 'lines+markers', name: 'Avg Price',
      x: d.labels, y: d.avg_price,
      line: { color: 'hsla(212,95%,58%,0.9)', width: 2.5, shape: 'spline' },
      marker: { size: 6, color: 'hsla(212,95%,58%,0.9)' },
      hovertemplate: '<b>%{x}</b><br>$%{y:,.0f}<extra></extra>',
    },
    {
      type: 'bar', name: 'Sales Volume',
      x: d.labels, y: d.sales_count,
      marker: { color: 'hsla(252,85%,68%,0.25)', line: { width: 0 } },
      hovertemplate: '<b>%{x}</b><br>%{y} sales<extra></extra>',
      yaxis: 'y2',
    }
  ], {
    ...BASE_LAYOUT,
    legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8', size: 9 } },
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0s' },
    yaxis2: { overlaying: 'y', side: 'right', gridcolor: 'transparent', tickfont: { color: '#64748b', size: 9 } },
    margin: { t: 10, b: 40, l: 60, r: 55 },
  }, CFG);
}

// S2: Renovation Bar
function renderS2() {
  const d = DATA.price_by_renovation;
  Plotly.newPlot('s2-chart', [{
    type: 'bar',
    x: d.labels, y: d.avg_price,
    marker: {
      color: d.labels.map(l => l === 'Renovated'
        ? 'hsla(170,85%,48%,0.85)'
        : 'hsla(252,85%,68%,0.75)'),
      line: { width: 0 },
    },
    text: d.avg_price.map(v => '$' + (v/1000).toFixed(0) + 'K'),
    textposition: 'outside',
    textfont: { color: '#e2e8f0', size: 13, family: 'Outfit' },
    hovertemplate: '<b>%{x}</b><br>$%{y:,.0f}<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
  }, CFG);
}

// S3: Age Distribution
function renderS3() {
  const d = DATA.house_age_distribution;
  Plotly.newPlot('s3-chart', [{
    type: 'bar',
    x: d.labels, y: d.count,
    marker: {
      color: [
        'hsla(170,85%,48%,0.85)',
        'hsla(212,95%,58%,0.85)',
        'hsla(252,85%,68%,0.85)',
        'hsla(38,95%,58%,0.85)',
      ],
      line: { width: 0 },
    },
    hovertemplate: '<b>%{x}</b><br>%{y:,} properties<extra></extra>',
  }], {
    ...BASE_LAYOUT,
    yaxis: { ...BASE_LAYOUT.yaxis, tickformat: ',d' },
  }, CFG);
}

// S4: Bedrooms + Bathrooms combined
function renderS4() {
  const br = DATA.bedrooms_vs_price;
  const ba = DATA.bathrooms_vs_price;
  Plotly.newPlot('s4-chart', [
    {
      type: 'bar', name: 'By Bedrooms',
      x: br.labels.map(v => v + ' BR'), y: br.avg_price,
      marker: { color: 'hsla(212,95%,58%,0.8)', line: { width: 0 } },
      hovertemplate: '<b>%{x}</b><br>$%{y:,.0f}<extra></extra>',
    },
    {
      type: 'bar', name: 'By Bathrooms',
      x: ba.labels, y: ba.avg_price,
      marker: { color: 'hsla(170,85%,48%,0.75)', line: { width: 0 } },
      hovertemplate: '<b>%{x}</b><br>$%{y:,.0f}<extra></extra>',
      xaxis: 'x2',
    }
  ], {
    ...BASE_LAYOUT,
    barmode: 'group',
    legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0)', font: { color: '#94a3b8', size: 9 } },
    yaxis: { ...BASE_LAYOUT.yaxis, tickprefix: '$', tickformat: ',.0f' },
    margin: { t: 10, b: 40, l: 60, r: 15 },
  }, CFG);
}
