/**
 * @version 1.0
 */
class DataAnalizis1 extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
    }

    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
    }

    #charts = {};
    #pendingData = null;

    static #COLORS = [
        '#4e9af1', '#f1964e', '#4ef179', '#f14e4e',
        '#9a4ef1', '#f1d84e', '#4ef1e2', '#f14ea0',
    ];

    async #initialize() {
        const owner = this;
        await owner.#loadChartJs();
        owner.#createCharts();

        const [vendite, change] = await Promise.all([
            Lobby.postAsync("DataAnalizis1/GetVendite", {}),
            Lobby.postAsync("DataAnalizis1/GetChange", {}),
        ]);

        // vendite columnar format: { Category: number[], TheTime: string[], Price: number[], CumulativePrice: number[] }
        // change columnar format:  { Category: number[], TheTime: string[], Change: number[], CumulativeChange: number[] }
        const rows1 = owner.#processVendite(vendite);
        const rows2 = owner.#processChange(change);
        // console.error(rows1)
        owner.setData(rows1, rows2);
    }

    static #MONTHS = [Locale.at('Jan'), Locale.at('Feb'), Locale.at('Mar'), Locale.at('Apr'), Locale.at('May'), Locale.at('Jun'), Locale.at('Jul'), Locale.at('Aug'), Locale.at('Sep'), Locale.at('Oct'), Locale.at('Nov'), Locale.at('Dec')];

    // Returns { key: "YYYY-MM", label: "Mon YYYY" } from an ISO datetime string
    static #monthInfo(isoStr) {
        const y = isoStr.slice(0, 4);
        const m = isoStr.slice(5, 7);
        return { key: `${y}-${m}`, label: `${DataAnalizis1.#MONTHS[+m - 1]} ${y}` };
    }

    /**
     * Converts GetVendite columnar response to row objects aggregated by category + month.
     * Sums Price per month; takes the max CumulativePrice as month-end value.
     * @param {{ Category: number[], TheTime: string[], Price: number[], CumulativePrice: number[] }} response
     * @returns {Array<{datetime: string, category: string, revenue: number, cumulativeRevenue: number}>}
     */
    #processVendite(response) {
        const { Category, TheTime, Price, CumulativePrice } = response;
        const n = TheTime.length;
        const aggMap = new Map();

        for (let i = 0; i < n; i++) {
            const cat = String(Category[i]);
            const { key, label } = DataAnalizis1.#monthInfo(TheTime[i]);
            const mapKey = `${cat}|${key}`;
            if (!aggMap.has(mapKey)) {
                aggMap.set(mapKey, { datetime: label, category: cat, revenue: 0, cumulativeRevenue: 0, _sortKey: `${cat}|${key}` });
            }
            const e = aggMap.get(mapKey);
            e.revenue = +(e.revenue + Price[i]).toFixed(2);
            if (CumulativePrice[i] > e.cumulativeRevenue) e.cumulativeRevenue = CumulativePrice[i];
        }

        return [...aggMap.values()].sort((a, b) => a._sortKey.localeCompare(b._sortKey));
    }

    /**
     * Converts GetChange columnar response to row objects aggregated by category + month.
     * @param {{ Category: number[], TheTime: string[], Change: number[], CumulativeChange: number[] }} response
     * @returns {Array<{datetime: string, category: string, change: number, cumulativeChange: number}>}
     */
    #processChange(response) {
        const { Category, TheTime, Change, CumulativeChange } = response;
        const n = TheTime.length;
        const aggMap = new Map();

        for (let i = 0; i < n; i++) {
            const cat = String(Category[i]);
            const { key, label } = DataAnalizis1.#monthInfo(TheTime[i]);
            const mapKey = `${cat}|${key}`;
            if (!aggMap.has(mapKey)) {
                aggMap.set(mapKey, { datetime: label, category: cat, change: 0, cumulativeChange: 0, _count: 0, _sortKey: `${cat}|${key}` });
            }
            const e = aggMap.get(mapKey);
            e.change += Change[i];
            e.cumulativeChange = CumulativeChange[i]; // last value per month
            e._count++;
        }

        return [...aggMap.values()]
            .sort((a, b) => a._sortKey.localeCompare(b._sortKey))
            .map(e => ({ datetime: e.datetime, category: e.category, change: +(e.change / e._count).toFixed(2), cumulativeChange: +e.cumulativeChange.toFixed(2) }));
    }

    #loadChartJs() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') { resolve(); return; }
            const id = 'npm-chart-js';
            if (!document.getElementById(id)) {
                const s = document.createElement('script');
                s.id = id;
                s.src = 'https://cdn.jsdelivr.net/npm/chart.js?v=016';
                document.head.appendChild(s);
            }
            const poll = setInterval(() => {
                if (typeof Chart !== 'undefined') { clearInterval(poll); resolve(); }
            }, 100);
        });
    }

    #createCharts() {
        const owner = this;
        const root = owner.self_ref;
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--vscode-editor-foreground').trim() || '#cccccc';
        const gridColor = style.getPropertyValue('--vscode-panel-border').trim() || '#3c3c3c';

        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;

        const makeChart = (fwId, yPrefix, ySuffix) => {
            const canvas = root.querySelector(`[fw-id="${fwId}"]`);
            if (!canvas) return null;
            return new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 10, font: { size: 10 } },
                        },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${c.dataset.label}: ${yPrefix}${c.raw}${ySuffix}`,
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 10 }, maxRotation: 45 },
                        },
                        y: {
                            ticks: {
                                font: { size: 10 },
                                callback: (v) => `${yPrefix}${v}${ySuffix}`,
                            },
                        },
                    },
                },
            });
        };

        owner.#charts.revenue = makeChart('canvas_revenue', '$', '');
        owner.#charts.cumRevenue = makeChart('canvas_cum_revenue', '$', '');
        owner.#charts.change = makeChart('canvas_change', '', '%');
        owner.#charts.cumChange = makeChart('canvas_cum_change', '', '%');
    }

    /**
     * Renders all four charts from two datatables.
     *
     * @param {Array<{datetime: string|Date, category: string, revenue: number, cumulativeRevenue: number}>} datatable1
     * @param {Array<{datetime: string|Date, category: string, change: number, cumulativeChange: number}>} datatable2
     */
    setData(datatable1, datatable2) {
        const owner = this;
        if (!owner.#charts.revenue) {
            owner.#pendingData = { dt1: datatable1, dt2: datatable2 };
            return;
        }
        owner.#applyToChart(owner.#charts.revenue, datatable1, 'revenue');
        owner.#applyToChart(owner.#charts.cumRevenue, datatable1, 'cumulativeRevenue');
        owner.#applyToChart(owner.#charts.change, datatable2, 'change');
        owner.#applyToChart(owner.#charts.cumChange, datatable2, 'cumulativeChange');
    }

    #applyToChart(chart, rows, valueField) {
        if (!chart || !Array.isArray(rows) || rows.length === 0) return;

        const labelSet = new Set();
        const byCategory = {};

        for (const row of rows) {
            const label = row.datetime instanceof Date
                ? row.datetime.toLocaleDateString()
                : String(row.datetime);
            labelSet.add(label);
            if (!byCategory[row.category]) byCategory[row.category] = {};
            byCategory[row.category][label] = row[valueField];
        }

        const labels = [...labelSet];
        const COLORS = DataAnalizis1.#COLORS;

        chart.data.labels = labels;
        chart.data.datasets = Object.entries(byCategory).map(([cat, data], i) => ({
            label: cat,
            data: labels.map(l => data[l] ?? null),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
        }));

        chart.update();
    }

    async #addEventListeners() {
        const owner = this;
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new DataAnalizis1({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER