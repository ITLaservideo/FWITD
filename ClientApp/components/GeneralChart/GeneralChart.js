class PCMockProduct {
    constructor(name, saleAmount) {
        this.name = name;
        this.saleAmount = saleAmount;
    }
}
/**
 * A single chart component covering pie/doughnut/bar/line (any Chart.js `type`, really) - kept as
 * one component instead of separate PieChart/BarChart/LineChart ones specifically so it only ever
 * loads Chart.js and its `lib/ChartBase.js` plumbing once, see the warning at the top of that file.
 * @version 1.0
 */
class GeneralChart extends FrameworkGC(`${injector_html}`) {
    static productsOne = Array.from({ length: 35 }, (_, i) => new PCMockProduct(`Product ${i + 1}`, Math.floor(Math.random() * 100)));
    /**
     * @param {Object} options
     * @param {"pie"|"doughnut"|"bar"|"line"|string} [options.type="bar"] any Chart.js chart type
     * @param {Array<PCMockProduct>} [options.products] pie/doughnut convenience input: `{name,
     *   saleAmount}` objects, auto-sorted, keeping the top 10 individually and bucketing the rest
     *   into a single "Others" slice. Only used when `type` is `pie`/`doughnut`; defaults to
     *   `GeneralChart.productsOne` mock data when the type is pie/doughnut and neither this nor
     *   `labels`/`data`/`datasets` is given.
     * @param {string[]} [options.labels] category/x-axis labels (bar/line, or pie/doughnut when
     *   not using the `products` convenience input)
     * @param {Array<{label:string, data:number[], color?:string}>} [options.datasets] one or more
     *   data series, each with one value per `labels` entry
     * @param {number[]} [options.data] shorthand for a single unlabeled series
     * @param {string} [options.series_label] label for the `options.data` shorthand series
     * @param {boolean} [options.horizontal] bar only: draws horizontal bars
     * @param {boolean} [options.filled] line only: shades the area under each line - just the
     *   initial state, also toggleable via the "Filled area" switch below the chart
     * @param {boolean} [options.smooth=true] line only: curved (`true`) vs straight (`false`) segments
     * @param {boolean} [options.overlay_controls=true] line only: shows a "Trend line"/"LOWESS
     *   Regression"/"Moving average"/"Min/max markers"/"Filled area" toggle row underneath the
     *   chart, letting the viewer add each overlay on demand instead of always cluttering the
     *   chart with all of them
     * @param {number} [options.moving_average_window=3] line only: trailing window size (in
     *   points) for the "Moving average" overlay when it's toggled on and not exponential
     * @param {boolean} [options.moving_average_exponential=false] line only: use an EMA instead
     *   of a plain SMA for the "Moving average" overlay
     * @param {Object} [options.chartjs_options] raw passthrough, shallow-merged on top of the
     *   Chart.js `options` this component builds - use for anything not exposed above
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        const owner = this;
        ChartBase.ensureLoaded().then(() => {
            if (owner.destroyed != true) {
                owner.#render(options);
            }
        }).catch((error) => console.error(error));
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref,
        /**
         * @type HTMLCanvasElement
         */
        canvas: null,
    }
    /**
     * @type {Chart}
     */
    chart_instance = null;
    #render(options) {
        const owner = this;
        const type = options.type ?? "bar";
        switch (type) {
            case "pie":
            case "doughnut":
                owner.#renderPieFamily(options, type);
                break;
            case "line":
                owner.#renderLine(options);
                break;
            default:
                owner.#renderBar(options, type);
                break;
        }
    }
    /**
     * @param {Object} options
     * @param {"pie"|"doughnut"} type
     */
    #renderPieFamily(options, type) {
        const owner = this;
        let labels, data;
        if (options.products != undefined || (options.labels == undefined && options.data == undefined && options.datasets == undefined)) {
            const products = options.products ?? Array.from(GeneralChart.productsOne);
            const sorted_products = [...products].sort((a, b) => b.saleAmount - a.saleAmount);
            const top_products = sorted_products.slice(0, 10);
            const others_total = sorted_products.slice(10).reduce((sum, product) => sum + product.saleAmount, 0);
            labels = top_products.map(product => product.name);
            data = top_products.map(product => product.saleAmount);
            if (others_total > 0) {
                labels.push("Others");
                data.push(others_total);
            }
        } else {
            labels = options.labels ?? [];
            data = options.data ?? (options.datasets ?? [])[0]?.data ?? [];
        }
        const colors = ChartBase.generatePalette(data.length, { saturation: 88, lightness: 32 });
        if (colors.length > 0) {
            colors[colors.length - 1] = "hsl(220, 13%, 18%)"; // "Others" always gets the same neutral slice
        }
        ChartBase.createOrUpdateChart(owner, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: "#ffffff",
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "top",
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.label || "";
                                if (label) {
                                    label += ": ";
                                }
                                label += context.raw;
                                return label;
                            }
                        }
                    }
                },
                ...options.chartjs_options,
            }
        });
    }
    /**
     * @param {Object} options
     * @param {string} type
     */
    #renderBar(options, type) {
        const owner = this;
        const datasets = options.datasets ?? [{
            label: options.series_label ?? "",
            data: options.data ?? [],
        }];
        const palette = ChartBase.generatePalette(datasets.length);
        ChartBase.createOrUpdateChart(owner, {
            type: type,
            data: {
                labels: options.labels ?? [],
                datasets: datasets.map((series, index) => ({
                    label: series.label ?? "",
                    data: series.data,
                    backgroundColor: series.color ?? palette[index],
                    borderRadius: 4,
                })),
            },
            options: {
                indexAxis: options.horizontal == true ? "y" : "x",
                responsive: true,
                plugins: {
                    legend: { display: datasets.length > 1 },
                },
                scales: {
                    x: { beginAtZero: options.horizontal == true },
                    y: { beginAtZero: options.horizontal != true },
                },
                ...options.chartjs_options,
            },
        });
    }
    /**
     * @param {Object} options
     * @param {Array<{label:string, data:number[], color?:string, type?:"line"|"bar", axis?:"y"|"y1"}>} [options.datasets]
     *   `type` renders that one series as a Chart.js "mixed chart" dataset sharing the same
     *   canvas/x-axis as the rest (e.g. a bar series alongside line series); `axis` puts it on the
     *   secondary (right-hand) `y1` scale instead of the default `y`, for series on a very
     *   different scale than the others (counts vs currency, say) - `y1` is only added to the
     *   chart at all when at least one series asks for it
     * @param {boolean} [options.overlay_controls=true] show the trend line/moving average/
     *   min-max marker toggles underneath the chart; set `false` to render the line chart alone
     * @param {number} [options.moving_average_window=3] forwarded to `ChartBase.movingAverage`
     * @param {boolean} [options.moving_average_exponential=false] forwarded to `ChartBase.movingAverage`
     */
    #renderLine(options) {
        const owner = this;
        const base_datasets = options.datasets ?? [{
            label: options.series_label ?? "",
            data: options.data ?? [],
        }];
        const palette = ChartBase.generatePalette(base_datasets.length);
        const uses_secondary_axis = base_datasets.some((series) => series.axis === "y1");
        const line_display_state = {
            regression: false,
            regression_blend: 0, // 0 = pure Linear Regression, 1 = pure LOWESS - see ChartBase.blendedRegressionLine
            moving_average: false,
            extrema: false,
            filled: options.filled == false
        };
        const buildChartConfig = () => {
            const datasets = [];
            base_datasets.forEach((series, index) => {
                const color = series.color ?? palette[index];
                const label = series.label ?? "";
                const is_bar = series.type === "bar";
                const axis = series.axis ?? "y";
                // Stable identity for this series' datasets across rebuilds, independent of
                // `label` (which itself changes for the regression overlay - see its LOWESS %
                // suffix below). `ChartBase.createOrUpdateChart` matches incoming datasets against
                // the chart's current ones by this `key` so it can update Chart.js's existing
                // dataset objects in place instead of handing it new ones every time - Chart.js
                // links a dataset to its previously-rendered elements by object identity, so a
                // fresh object every rebuild would make it treat the series as new and animate it
                // in from scratch on every toggle/slider change.
                const series_key = `series-${index}`;
                datasets.push(is_bar ? {
                    key: series_key,
                    type: "bar",
                    label: label,
                    data: series.data,
                    backgroundColor: color,
                    borderRadius: 4,
                    yAxisID: axis,
                } : {
                    key: series_key,
                    label: label,
                    data: series.data,
                    borderColor: color,
                    backgroundColor: ChartBase.withAlpha(color, 0.5), // fill area only - see pointBackgroundColor below
                    pointBackgroundColor: color,
                    fill: line_display_state.filled,
                    tension: (options.smooth ?? true) ? 0.35 : 0,
                    pointRadius: 3,
                    yAxisID: axis,
                });
                if (line_display_state.regression && series.type != "bar") {
                    const lowess_percent = Math.round(line_display_state.regression_blend * 100);
                    datasets.push({
                        key: `${series_key}-regression`,
                        label: `${label ? label + " " : ""}regression (${lowess_percent}% LOWESS)`,
                        data: ChartBase.blendedRegressionLine(series.data, line_display_state.regression_blend),
                        borderColor: color,
                        borderDash: [6, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false,
                        tension: line_display_state.regression_blend > 0 ? 0.2 : 0,
                        yAxisID: axis,
                        is_overlay: true,
                    });
                }
                if (line_display_state.moving_average) {
                    datasets.push({
                        key: `${series_key}-moving_average`,
                        label: `${label ? label + " " : ""}moving avg`,
                        data: ChartBase.movingAverage(series.data, {
                            window: options.moving_average_window ?? 3,
                            exponential: options.moving_average_exponential == true,
                        }),
                        borderColor: color,
                        borderDash: [2, 2],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.2,
                        yAxisID: axis,
                        is_overlay: true,
                    });
                }
                if (line_display_state.extrema) {
                    const { peaks, troughs } = ChartBase.findExtrema(series.data);
                    datasets.push({
                        key: `${series_key}-peak`,
                        label: `${label ? label + " " : ""}peak`,
                        data: peaks,
                        showLine: false,
                        pointStyle: "triangle",
                        pointRadius: 7,
                        pointBackgroundColor: "#2bde3f",
                        borderColor: "#2bde3f",
                        yAxisID: axis,
                        is_overlay: true,
                    });
                    datasets.push({
                        key: `${series_key}-trough`,
                        label: `${label ? label + " " : ""}trough`,
                        data: troughs,
                        showLine: false,
                        pointStyle: "rectRot",
                        pointRadius: 7,
                        pointBackgroundColor: "#e42636",
                        borderColor: "#e42636",
                        yAxisID: axis,
                        is_overlay: true,
                    });
                }
            });
            return {
                type: "line",
                data: {
                    labels: options.labels ?? [],
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    plugins: {
                        // the regression/moving-average/peak/trough entries are already toggled from the
                        // controls row underneath the chart (#buildLineDisplayControls) - listing
                        // them again as legend items would just be a second, redundant in-canvas
                        // toggle that eats into the plot area, so they're filtered out here; the
                        // legend itself still only shows up when there's more than one *base* series
                        legend: {
                            display: base_datasets.length > 1,
                            labels: {
                                filter: (legend_item, chart_data) => chart_data.datasets[legend_item.datasetIndex]?.is_overlay != true,
                            },
                        },
                    },
                    scales: {
                        y: { beginAtZero: true },
                        // only added when a series actually asks for it (options.datasets[].axis === "y1") -
                        // keeps a single-axis chart's config (and its "y" grid lines) exactly as before
                        ...(uses_secondary_axis ? {
                            y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false } },
                        } : {}),
                    },
                    ...options.chartjs_options,
                },
            };
        };
        ChartBase.createOrUpdateChart(owner, buildChartConfig());
        if (options.overlay_controls ?? true) {
            owner.#buildLineDisplayControls(line_display_state, buildChartConfig);
        }
    }
    /**
     * Builds the "Regression" / "Moving average" / "Min/max markers" / "Filled area" toggle row
     * underneath the line chart canvas; each toggle just flips its own flag in
     * `line_display_state` and rebuilds the config via `buildChartConfig`, then hands it to
     * `ChartBase.createOrUpdateChart`, which updates the existing Chart.js instance in place
     * rather than recreating it. The "Regression" toggle also gets a blend slider (see
     * `#buildRegressionBlendSlider`) that morphs its overlay between Linear Regression and LOWESS.
     * @param {{regression:boolean, regression_blend:number, moving_average:boolean, extrema:boolean, filled:boolean}} line_display_state
     * @param {() => Object} buildChartConfig
     */
    #buildLineDisplayControls(line_display_state, buildChartConfig) {
        const owner = this;
        const controls = document.createElement("div");
        controls.className = "general-chart-line-controls";
        const makeDisplayToggle = (key, label, onToggled) => {
            const toggle_options = {
                label: label,
                innerText: { on: "on", off: "off" },
                isOn: line_display_state[key],
                theme: "mini",
                onClick: () => {
                    line_display_state[key] = !line_display_state[key];
                    toggle_options.setIsOn(line_display_state[key]);
                    onToggled?.();
                    ChartBase.createOrUpdateChart(owner, buildChartConfig());
                },
            };
            return UiBuilder.createToggle(toggle_options);
        };
        const blend_slider = owner.#buildRegressionBlendSlider(line_display_state, buildChartConfig);
        controls.appendChild(makeDisplayToggle("regression", Locale.at("Regression"), () => blend_slider.setEnabled(line_display_state.regression)));
        controls.appendChild(blend_slider);
        //controls.appendChild(makeDisplayToggle("moving_average", "Moving average"));
        //controls.appendChild(makeDisplayToggle("extrema", Locale.at("Min/max markers")));
        controls.appendChild(makeDisplayToggle("filled", Locale.at("Filled area")));
        owner.self_ref.appendChild(controls);
    }
    /**
     * Slider that morphs the "regression" overlay between a straight Linear Regression line (0%)
     * and a full LOWESS curve (100%) - see `ChartBase.blendedRegressionLine`. Stays visible but
     * disabled while the "Regression" toggle is off, so its position isn't lost when re-enabled.
     * @param {{regression:boolean, regression_blend:number}} line_display_state
     * @param {() => Object} buildChartConfig
     * @returns {HTMLDivElement} also gains a `setEnabled(is_enabled)` function
     */
    #buildRegressionBlendSlider(line_display_state, buildChartConfig) {
        const owner = this;
        const wrap = document.createElement("div");
        wrap.className = "general-chart-regression-blend";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.step = "5";
        slider.value = String(Math.round(line_display_state.regression_blend * 100));
        const caption = document.createElement("span");
        caption.className = "general-chart-regression-blend-caption";
        caption.innerText = `${Locale.at("Linear")} ↔ ${Locale.at("LOWESS")}`;
        // Separate, absolutely-positioned span for the value (see GeneralChart.css) so its
        // digit-count changes (5% vs 100%) don't reflow the label text next to it. Writing to
        // its own textContent - rather than a `data-*` attribute on `caption` read via `::after` -
        // avoids retriggering whatever picks up `caption`'s attribute mutations and was replaying
        // the chart's entrance ("pop up from the ground") animation on every slider tick
        const caption_value = document.createElement("span");
        caption_value.className = "general-chart-regression-blend-caption-value";
        caption.appendChild(caption_value);
        const updateCaption = () => {
            caption_value.textContent = `(${slider.value}%)`;
        };
        slider.addEventListener("input", () => {
            line_display_state.regression_blend = Number(slider.value) / 100;
            updateCaption();
            ChartBase.createOrUpdateChart(owner, buildChartConfig());
        });
        wrap.setEnabled = (is_enabled) => {
            wrap.classList.toggle("disabled", !is_enabled);
            slider.disabled = !is_enabled;
        };
        updateCaption();
        wrap.setEnabled(line_display_state.regression);
        wrap.appendChild(slider);
        wrap.appendChild(caption);
        return wrap;
    }
    /**
     * @param {number} timeout_ms 0 by default
     */
    destroy(timeout_ms = 0) {
        const owner = this;
        owner.destroyed = true;
        ChartBase.destroy(owner, timeout_ms, (final_timeout_ms) => super.destroy(final_timeout_ms));
    }
}

//#NOSTART RESERVED AREA FOR UI_BUILDER
/*mock for the UIBuilder::live-watch-component uncomment to test it  */
// mock data: 30 days, each day a random number of individual product sales - "products sold"
// and "revenue" (below) are both *derived* from this same per-day list, so they always agree
// with one another instead of being two independently-rolled random series
const PRODUCT_CATALOG = [
    { name: "Widget", price: 9.99 },
    { name: "Gadget", price: 24.5 },
    { name: "Doohickey", price: 14.75 },
    { name: "Gizmo", price: 39 },
    { name: "Thingamajig", price: 6.25 },
];
const day_labels = Array.from({ length: 60 }, (_, day_index) => `Day ${day_index + 1}`);
const randomDailySales = () => Array.from({ length: 60 }, () => {
    const products_sold_that_day = 5 + Math.floor(Math.random() * 20); // n
    return Array.from({ length: products_sold_that_day }, () => PRODUCT_CATALOG[Math.floor(Math.random() * PRODUCT_CATALOG.length)]); // each x product at its y price
});
const mock_container = document.createElement("div");
mock_container.style.display = "flex";
mock_container.style.flexDirection = "column";
mock_container.style.gap = "24px";
mock_container.style.padding = "20px";
mock_container.style.maxHeight = "100vh";
mock_container.style.boxSizing = "border-box";
mock_container.style.overflowY = "auto";
document.body.appendChild(mock_container);
UiBuilder.createScrollToTop({ target: mock_container }); // container grows tall with 3 panels

// mock data: same per-day product-sales generator used below, just pre-rolled once and
// summarized into revenue ("linear") / units sold ("volume") per day, with real Date objects
// for the last 30 days since createChart reads day/month/year off of them directly
const dotted_chart_sales = randomDailySales();
const dotted_chart_axys_x = Array.from({ length: 60 }, (_, day_index) => {
    const date = new Date();
    date.setDate(date.getDate() - (59 - day_index));
    return date;
});
mock_container.appendChild(UiBuilder.createChart({
    title: Locale.at("Daily sales"),
    title_volume: Locale.at("quantitties"),
    title_linear: "€",
    type: "dotted",
    data: {
        linear: dotted_chart_sales.map(day => Math.round(day.reduce((sum, product) => sum + product.price * 0.9, 0) * 100) / 100),
        volume: dotted_chart_sales.map(day => day.length),
        axys_x: dotted_chart_axys_x,
    },
    id: "some-random"
}));
const makePanel = (title) => {
    const panel = document.createElement("div");
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.gap = "10px";
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    const title_el = document.createElement("strong");
    title_el.innerText = title;
    header.appendChild(title_el);
    panel.appendChild(header);
    mock_container.appendChild(panel);
    return { panel, header };
};


// controls: a settings row driving whether the line panel below plots smooth or straight segments
let use_smooth_line = true;
const smooth_toggle_options = {
    innerText: { on: "smooth", off: "straight" },
    isOn: use_smooth_line,
    onClick: () => {
        use_smooth_line = !use_smooth_line;
        smooth_toggle_options.setIsOn(use_smooth_line);
        rebuildLine();
    },
};

// pie - defaults to GeneralChart.productsOne mock data, just a badge to flag it as demo-only
const pie_panel = makePanel("Sales share");
pie_panel.header.appendChild(UiBuilder.createBadge("mock data", { color: "neutral" }));
const pie = new GeneralChart({ type: "pie" });
pie_panel.panel.appendChild(pie.elementReference());

// bar - createAsyncButton simulates a server round-trip that regenerates the data, occasionally
// failing on purpose to show off the automatic error toast
const bar_panel = makePanel("Weekly orders");
const random_week = () => Array.from({ length: 5 }, () => Math.floor(Math.random() * 25));
let bar_chart = new GeneralChart({
    type: "bar",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
        { label: "This week", data: [12, 19, 8, 15, 22] },
        { label: "Last week", data: [9, 14, 11, 10, 18] },
    ],
});
bar_panel.panel.appendChild(bar_chart.elementReference());
bar_panel.header.appendChild(UiBuilder.createAsyncButton({
    title: "regenerate",
    onClick: async () => {
        await new Promise((resolve, reject) => setTimeout(() => {
            Math.random() < 0.8 ? resolve() : reject(new Error("mock regenerate failure"));
        }, 600));
        bar_chart.destroy();
        bar_chart = new GeneralChart({
            type: "bar",
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [
                { label: "This week", data: random_week() },
                { label: "Last week", data: random_week() },
            ],
        });
        bar_panel.panel.appendChild(bar_chart.elementReference());
    },
}));

mock_container.appendChild(UiBuilder.createSettingsGroup({
    title: "chart controls",
    rows: [UiBuilder.createSettingsRow({
        label: "Line chart style",
        description: "toggles GeneralChart's `smooth` option",
        control: UiBuilder.createToggle(smooth_toggle_options),
    })],
}));
// line - fetched through UiBuilder.renderAsyncView, so the panel shows a SkeletonLoader while
// "loading", the chart on success, or a retry-wired EmptyState on (simulated) failure; two
// series - count of products sold and their total price - both derived from the same 30-day
// mock sales list (see PRODUCT_CATALOG/randomDailySales above), sharing one canvas as a mixed
// chart: "Revenue" as a line and "Products sold" as bars, both on the same (left) axis so their
// heights stay directly comparable; also rebuilt whenever the smooth/straight toggle above changes
const line_panel = makePanel("Daily sales");
line_panel.header.appendChild(UiBuilder.createBadge("simulated fetch", { color: "info" }));
const line_container = document.createElement("div");
line_container.style.minHeight = "320px";
line_panel.panel.appendChild(line_container);
function rebuildLine() {
    UiBuilder.renderAsyncView(line_container, {
        promise_factory: () => new Promise((resolve, reject) => setTimeout(() => {
            Math.random() < 0.85 ? resolve(randomDailySales()) : reject(new Error("mock fetch failure"));
        }, 700)),
        render: (daily_sales) => new GeneralChart({
            type: "line",
            labels: day_labels,
            datasets: [
                { label: "Products sold", type: "bar", data: daily_sales.map((sales) => sales.length) },
                { label: "Revenue", data: daily_sales.map((sales) => sales.reduce((sum, product) => sum + product.price, 0)) },
            ],
            filled: true,
            smooth: use_smooth_line,
        }).elementReference(),
    });
}
rebuildLine();

//#END RESERVED AREA FOR UI_BUILDER