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
     * @param {boolean} [options.overlay_controls=true] line only: shows a "Trend line"/"Moving
     *   average"/"Min/max markers"/"Filled area" toggle row underneath the chart, letting the
     *   viewer add each overlay on demand instead of always cluttering the chart with all of them
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
        const line_display_state = { trend: false, moving_average: false, extrema: false, filled: options.filled == true };
        const buildChartConfig = () => {
            const datasets = [];
            base_datasets.forEach((series, index) => {
                const color = series.color ?? palette[index];
                const label = series.label ?? "";
                datasets.push({
                    label: label,
                    data: series.data,
                    borderColor: color,
                    backgroundColor: ChartBase.withAlpha(color, 0.5), // fill area only - see pointBackgroundColor below
                    pointBackgroundColor: color,
                    fill: line_display_state.filled,
                    tension: (options.smooth ?? true) ? 0.35 : 0,
                    pointRadius: 3,
                });
                if (line_display_state.trend) {
                    datasets.push({
                        label: `${label ? label + " " : ""}trend`,
                        data: ChartBase.linearRegressionLine(series.data),
                        borderColor: color,
                        borderDash: [6, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false,
                        tension: 0,
                        is_overlay: true,
                    });
                }
                if (line_display_state.moving_average) {
                    datasets.push({
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
                        is_overlay: true,
                    });
                }
                if (line_display_state.extrema) {
                    const { peaks, troughs } = ChartBase.findExtrema(series.data);
                    datasets.push({
                        label: `${label ? label + " " : ""}peak`,
                        data: peaks,
                        showLine: false,
                        pointStyle: "triangle",
                        pointRadius: 7,
                        pointBackgroundColor: "#2bde3f",
                        borderColor: "#2bde3f",
                        is_overlay: true,
                    });
                    datasets.push({
                        label: `${label ? label + " " : ""}trough`,
                        data: troughs,
                        showLine: false,
                        pointStyle: "rectRot",
                        pointRadius: 7,
                        pointBackgroundColor: "#e42636",
                        borderColor: "#e42636",
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
                        // the trend/moving-average/peak/trough entries are already toggled from the
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
     * Builds the "Trend line" / "Moving average" / "Min/max markers" / "Filled area" toggle row
     * underneath the line chart canvas; each toggle just flips its own flag in
     * `line_display_state` and rebuilds the chart via `buildChartConfig` (cheap enough - Chart.js
     * instances aren't kept around between toggles, `ChartBase.createOrUpdateChart` already
     * destroys the previous one first).
     * @param {{trend:boolean, moving_average:boolean, extrema:boolean, filled:boolean}} line_display_state
     * @param {() => Object} buildChartConfig
     */
    #buildLineDisplayControls(line_display_state, buildChartConfig) {
        const owner = this;
        const controls = document.createElement("div");
        controls.className = "general-chart-line-controls";
        const makeDisplayToggle = (key, label) => {
            const toggle_options = {
                label: label,
                innerText: { on: "on", off: "off" },
                isOn: line_display_state[key],
                theme: "mini",
                onClick: () => {
                    line_display_state[key] = !line_display_state[key];
                    toggle_options.setIsOn(line_display_state[key]);
                    ChartBase.createOrUpdateChart(owner, buildChartConfig());
                },
            };
            return UiBuilder.createToggle(toggle_options);
        };
        controls.appendChild(makeDisplayToggle("trend", "Trend line"));
        //controls.appendChild(makeDisplayToggle("moving_average", "Moving average"));
        controls.appendChild(makeDisplayToggle("extrema", "Min/max markers"));
        controls.appendChild(makeDisplayToggle("filled", "Filled area"));
        owner.self_ref.appendChild(controls);
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

//#START RESERVED AREA FOR UI_BUILDER
/*mock for the UIBuilder::live-watch-component uncomment to test it  */
// const mock_container = document.createElement("div");
// mock_container.style.display = "flex";
// mock_container.style.flexDirection = "column";
// mock_container.style.gap = "24px";
// mock_container.style.padding = "20px";
// mock_container.style.maxHeight = "100vh";
// mock_container.style.boxSizing = "border-box";
// mock_container.style.overflowY = "auto";
// document.body.appendChild(mock_container);
// UiBuilder.createScrollToTop({ target: mock_container }); // container grows tall with 3 panels

// const makePanel = (title) => {
//     const panel = document.createElement("div");
//     panel.style.display = "flex";
//     panel.style.flexDirection = "column";
//     panel.style.gap = "10px";
//     const header = document.createElement("div");
//     header.style.display = "flex";
//     header.style.alignItems = "center";
//     header.style.gap = "8px";
//     const title_el = document.createElement("strong");
//     title_el.innerText = title;
//     header.appendChild(title_el);
//     panel.appendChild(header);
//     mock_container.appendChild(panel);
//     return { panel, header };
// };

// // controls: a settings row driving whether the line panel below plots smooth or straight segments
// let use_smooth_line = true;
// const smooth_toggle_options = {
//     innerText: { on: "smooth", off: "straight" },
//     isOn: use_smooth_line,
//     onClick: () => {
//         use_smooth_line = !use_smooth_line;
//         smooth_toggle_options.setIsOn(use_smooth_line);
//         rebuildLine();
//     },
// };

// // pie - defaults to GeneralChart.productsOne mock data, just a badge to flag it as demo-only
// const pie_panel = makePanel("Sales share");
// pie_panel.header.appendChild(UiBuilder.createBadge("mock data", { color: "neutral" }));
// const pie = new GeneralChart({ type: "pie" });
// pie_panel.panel.appendChild(pie.elementReference());

// // bar - createAsyncButton simulates a server round-trip that regenerates the data, occasionally
// // failing on purpose to show off the automatic error toast
// const bar_panel = makePanel("Weekly orders");
// const random_week = () => Array.from({ length: 5 }, () => Math.floor(Math.random() * 25));
// let bar_chart = new GeneralChart({
//     type: "bar",
//     labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
//     datasets: [
//         { label: "This week", data: [12, 19, 8, 15, 22] },
//         { label: "Last week", data: [9, 14, 11, 10, 18] },
//     ],
// });
// bar_panel.panel.appendChild(bar_chart.elementReference());
// bar_panel.header.appendChild(UiBuilder.createAsyncButton({
//     title: "regenerate",
//     onClick: async () => {
//         await new Promise((resolve, reject) => setTimeout(() => {
//             Math.random() < 0.8 ? resolve() : reject(new Error("mock regenerate failure"));
//         }, 600));
//         bar_chart.destroy();
//         bar_chart = new GeneralChart({
//             type: "bar",
//             labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
//             datasets: [
//                 { label: "This week", data: random_week() },
//                 { label: "Last week", data: random_week() },
//             ],
//         });
//         bar_panel.panel.appendChild(bar_chart.elementReference());
//     },
// }));

// mock_container.appendChild(UiBuilder.createSettingsGroup({
//     title: "chart controls",
//     rows: [UiBuilder.createSettingsRow({
//         label: "Line chart style",
//         description: "toggles GeneralChart's `smooth` option",
//         control: UiBuilder.createToggle(smooth_toggle_options),
//     })],
// }));
// // line - fetched through UiBuilder.renderAsyncView, so the panel shows a SkeletonLoader while
// // "loading", the chart on success, or a retry-wired EmptyState on (simulated) failure; also
// // rebuilt whenever the smooth/straight toggle above changes
// const line_panel = makePanel("Revenue trend");
// line_panel.header.appendChild(UiBuilder.createBadge("simulated fetch", { color: "info" }));
// const line_container = document.createElement("div");
// line_container.style.minHeight = "320px";
// line_panel.panel.appendChild(line_container);
// function rebuildLine() {
//     UiBuilder.renderAsyncView(line_container, {
//         promise_factory: () => new Promise((resolve, reject) => setTimeout(() => {
//             Math.random() < 0.85
//                 ? resolve([30, 45, 28, 60, 52].map((v) => Math.round(v * (0.7 + Math.random() * 0.6))))
//                 : reject(new Error("mock fetch failure"));
//         }, 700)),
//         render: (data) => new GeneralChart({
//             type: "line",
//             labels: ["Jan", "Feb", "Mar", "Apr", "May"],
//             data: data,
//             series_label: "Revenue",
//             filled: true,
//             smooth: use_smooth_line,
//         }).elementReference(),
//     });
// }
// rebuildLine();
//#END RESERVED AREA FOR UI_BUILDER