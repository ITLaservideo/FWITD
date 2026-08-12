/**
 * Chart.js plumbing for `GeneralChart`: lazy-loads Chart.js from CDN exactly once, and
 * centralizes the chart-instance lifecycle (replace/destroy) and the optional destroy fade-out.
 *
 * Lives in `GeneralChart/lib/` rather than inline in `GeneralChart.js` purely to keep the data-
 * shaping code (pie/bar/line config building) separate from this CDN-loading/lifecycle plumbing.
 * Deliberately a plain class, NOT `extends FrameworkGC(...)`: the build pipeline only runs the
 * `${injector_html}`/`fw-id` linking step against the component's own main `{Name}.js` file
 * before `lib/` files get prepended, so the FrameworkGC template wiring has to stay in
 * `GeneralChart.js` itself; this base is used via composition (static helpers), not inheritance.
 *
 * IMPORTANT: don't copy this file into another component's `lib/` folder - a page that ends up
 * loading two components which each ship their own `class ChartBase` will get a `SyntaxError:
 * Identifier 'ChartBase' has already been declared` for the whole bundle (components are
 * concatenated into one script). That's exactly why chart types are unified into one
 * `GeneralChart` component instead of separate PieChart/BarChart/LineChart ones.
 * @version 1.0
 */
class ChartBase {
    static enable_animations = document.querySelector("[name~=enable-animations][content]")?.content == "true";
    static #chart_js_ready = null;
    /**
     * @returns {Promise<void>} resolves once Chart.js is available on `window.Chart`
     */
    static ensureLoaded() {
        if (ChartBase.#chart_js_ready == null) {
            ChartBase.#chart_js_ready = new Promise((resolve, reject) => {
                if (typeof Chart !== "undefined") {
                    resolve();
                    return;
                }
                const script_id = "npm-chart-js";
                let script = document.getElementById(script_id);
                if (script == null) {
                    script = document.createElement("script");
                    script.id = script_id;
                    script.src = "https://cdn.jsdelivr.net/npm/chart.js?v=016";
                    document.head.appendChild(script);
                }
                script.addEventListener("load", () => resolve());
                script.addEventListener("error", () => reject(new Error("failed to load chart.js")));
            });
        }
        return ChartBase.#chart_js_ready;
    }
    /**
     * Creates `owner.chart_instance` on first call; on later calls (e.g. a toggle/slider driving
     * `GeneralChart`'s overlay controls) reuses the existing Chart.js instance instead of
     * destroying and recreating it.
     *
     * Just assigning a freshly-built `data`/`options` and calling `update()` is NOT enough to get
     * an animated transition: Chart.js links each dataset to its previously-rendered elements by
     * object identity (`Chart.getDatasetMeta` matches via `meta._dataset === dataset`), so handing
     * it a brand new plain object for every dataset on every call - which `GeneralChart`'s
     * `buildChartConfig` does - makes it treat every dataset as unrelated to what's already on
     * screen. It then animates each one in from scratch (elements growing up from the axis),
     * which looks identical to a full chart rebuild even though the `Chart` instance itself is
     * being reused. So incoming datasets carrying a `key` (see `buildChartConfig`) are matched
     * against the chart's current datasets by that key first, and their values are copied onto
     * the SAME object Chart.js already knows about - only a dataset whose `key` wasn't present
     * before (or that has no `key` at all) renders as a genuinely new series and animates in.
     * @param {{chart_instance:(Chart|null), elements:{canvas:HTMLCanvasElement}}} owner
     * @param {Object} chartjs_config a Chart.js `config` object (`type`/`data`/`options`); each
     *   entry in `chartjs_config.data.datasets` may carry a `key` for identity across calls
     */
    static createOrUpdateChart(owner, chartjs_config) {
        const chart = owner.chart_instance;
        if (chart != null) {
            const previous_by_key = new Map(chart.data.datasets.map((dataset) => [dataset.key, dataset]));
            chart.data.labels = chartjs_config.data.labels;
            chart.data.datasets = chartjs_config.data.datasets.map((incoming_dataset) => {
                const existing_dataset = incoming_dataset.key != null ? previous_by_key.get(incoming_dataset.key) : null;
                if (existing_dataset == null) {
                    return incoming_dataset;
                }
                Object.assign(existing_dataset, incoming_dataset);
                return existing_dataset;
            });
            chart.config.type = chartjs_config.type;
            chart.options = chartjs_config.options;
            chart.update();
            return;
        }
        owner.chart_instance = new Chart(owner.elements.canvas.getContext("2d"), chartjs_config);
    }
    /**
     * Common destroy plumbing: tears down the Chart.js instance, plays the fade-out animation
     * when enabled (bumping `timeout_ms` to let it finish), then calls `base_destroy` (the
     * component's own `FrameworkGC.destroy` it would otherwise have called directly).
     * @param {{chart_instance:(Chart|null), self_ref:HTMLElement}} owner
     * @param {number} timeout_ms
     * @param {(timeout_ms:number) => void} base_destroy
     */
    static destroy(owner, timeout_ms, base_destroy) {
        if (owner.chart_instance != null) {
            owner.chart_instance.destroy();
            owner.chart_instance = null;
        }
        if (ChartBase.enable_animations == true) {
            owner.self_ref.classList.add("chart-fade-out");
            timeout_ms = Math.max(timeout_ms, 200);
        }
        base_destroy(timeout_ms);
    }
    /**
     * Deterministic, evenly-spaced hue palette - avoids the visually-clashing/repeating colors
     * `Math.random()`-based palettes tend to produce on repeated calls.
     * @param {number} count
     * @param {Object} [options]
     * @param {number} [options.saturation=70]
     * @param {number} [options.lightness=45]
     * @returns {string[]}
     */
    static generatePalette(count, options = {}) {
        const saturation = options.saturation ?? 70;
        const lightness = options.lightness ?? 45;
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${Math.round((i * 360) / Math.max(count, 1))}, ${saturation}%, ${lightness}%)`);
        }
        return colors;
    }
    /**
     * Returns `css_color` (any valid CSS color - `hsl(...)`, hex, named, `rgb(...)`, ...) as an
     * `rgba(...)` string with `alpha` substituted in, by letting the browser's own color parser
     * normalize it first (via a throwaway element's computed style) rather than hand-rolling a
     * parser for every format Chart.js callers might pass in as a series `color`.
     * @param {string} css_color
     * @param {number} alpha 0-1
     * @returns {string}
     */
    static withAlpha(css_color, alpha) {
        const probe = document.createElement("div");
        probe.style.color = css_color;
        document.body.appendChild(probe);
        const computed_color = getComputedStyle(probe).color; // normalized to "rgb(r, g, b)" (or already "rgba(...)")
        probe.remove();
        const match = computed_color.match(/rgba?\(([^)]+)\)/);
        if (match == null) {
            return css_color; // couldn't parse it (shouldn't happen for a valid CSS color) - fall back as-is
        }
        const [r, g, b] = match[1].split(",").map((part) => part.trim());
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    /**
     * Least-squares linear regression over `data` (x = index) - a straight line showing the
     * overall direction of the series, ignoring point-to-point noise. `null`/`undefined` entries
     * are excluded from the fit but still produce a `null` at that index in the returned array,
     * so it lines up with `data` for direct use as a same-length Chart.js dataset.
     * @param {Array<number|null>} data
     * @returns {Array<number|null>}
     */
    static linearRegressionLine(data) {
        const known_points = data
            .map((value, index) => (value == null ? null : [index, value]))
            .filter((point) => point != null);
        if (known_points.length < 2) {
            return data.map(() => null);
        }
        const n = known_points.length;
        const sum_x = known_points.reduce((sum, [x]) => sum + x, 0);
        const sum_y = known_points.reduce((sum, [, y]) => sum + y, 0);
        const sum_xy = known_points.reduce((sum, [x, y]) => sum + x * y, 0);
        const sum_xx = known_points.reduce((sum, [x]) => sum + x * x, 0);
        const denominator = n * sum_xx - sum_x * sum_x;
        const slope = denominator === 0 ? 0 : (n * sum_xy - sum_x * sum_y) / denominator;
        const intercept = (sum_y - slope * sum_x) / n;
        return data.map((value, index) => (value == null ? null : slope * index + intercept));
    }
    /**
     * LOWESS (locally weighted scatterplot smoothing) curve over `data` (x = index) - unlike
     * `linearRegressionLine`'s single straight line, this fits a local weighted linear regression
     * around every point (tricube-weighted by distance, within a `bandwidth`-sized neighborhood),
     * so it follows curvature/bends in the series while still smoothing out point-to-point noise.
     * Same `null`-handling contract as `linearRegressionLine`.
     * @param {Array<number|null>} data
     * @param {Object} [options]
     * @param {number} [options.bandwidth=0.3] fraction (0-1] of the known points to include in
     *   each local fit's neighborhood; smaller follows the data more closely, larger smooths more
     * @returns {Array<number|null>}
     */
    static lowessRegressionLine(data, options = {}) {
        const known_points = data
            .map((value, index) => (value == null ? null : [index, value]))
            .filter((point) => point != null);
        const result = data.map(() => null);
        if (known_points.length < 2) {
            return result;
        }
        const bandwidth = options.bandwidth ?? 0.3;
        const n = known_points.length;
        const window_size = Math.min(n, Math.max(2, Math.round(bandwidth * n)));
        known_points.forEach(([x0]) => {
            const distances = known_points.map(([x]) => Math.abs(x - x0));
            const max_distance = [...distances].sort((a, b) => a - b)[window_size - 1] || 1e-9;
            let sum_w = 0, sum_wx = 0, sum_wy = 0, sum_wxy = 0, sum_wxx = 0;
            known_points.forEach(([x, y], index) => {
                const u = distances[index] / max_distance;
                const weight = u >= 1 ? 0 : Math.pow(1 - Math.pow(u, 3), 3); // tricube kernel
                sum_w += weight;
                sum_wx += weight * x;
                sum_wy += weight * y;
                sum_wxy += weight * x * y;
                sum_wxx += weight * x * x;
            });
            const denominator = sum_w * sum_wxx - sum_wx * sum_wx;
            if (denominator === 0) {
                result[x0] = sum_wy / sum_w;
                return;
            }
            const slope = (sum_w * sum_wxy - sum_wx * sum_wy) / denominator;
            const intercept = (sum_wy - slope * sum_wx) / sum_w;
            result[x0] = slope * x0 + intercept;
        });
        return result;
    }
    /**
     * Blends `ChartBase.linearRegressionLine` and `ChartBase.lowessRegressionLine` point-by-point,
     * so a single continuous control can morph the overlay from the straight trend line
     * (`blend=0`) to the full LOWESS curve (`blend=1`) instead of the two being independent
     * on/off overlays. Same `null`-handling contract as both.
     * @param {Array<number|null>} data
     * @param {number} blend 0 (pure linear) - 1 (pure LOWESS)
     * @param {Object} [lowess_options] forwarded to `ChartBase.lowessRegressionLine`
     * @returns {Array<number|null>}
     */
    static blendedRegressionLine(data, blend, lowess_options = {}) {
        const linear = ChartBase.linearRegressionLine(data);
        if (blend <= 0) {
            return linear;
        }
        const lowess = ChartBase.lowessRegressionLine(data, lowess_options);
        if (blend >= 1) {
            return lowess;
        }
        return linear.map((linear_value, index) => {
            const lowess_value = lowess[index];
            return linear_value == null || lowess_value == null
                ? null
                : linear_value * (1 - blend) + lowess_value * blend;
        });
    }
    /**
     * Simple or exponential moving average of `data`, used to smooth out noise and make the
     * underlying trend easier to read.
     * @param {Array<number|null>} data
     * @param {Object} [options]
     * @param {boolean} [options.exponential=false] `true` for an EMA (weights recent points more
     *   heavily, reacts faster), `false` for a plain trailing SMA
     * @param {number} [options.window=3] SMA only: how many trailing points each average covers;
     *   the first `window - 1` entries have no full window yet and come back as `null`
     * @param {number} [options.smoothing=0.3] EMA only: weight (0-1) given to each new point;
     *   higher reacts faster to recent changes, lower smooths more aggressively
     * @returns {Array<number|null>}
     */
    static movingAverage(data, options = {}) {
        return options.exponential == true
            ? ChartBase.#exponentialMovingAverage(data, options.smoothing ?? 0.3)
            : ChartBase.#simpleMovingAverage(data, options.window ?? 3);
    }
    static #simpleMovingAverage(data, window) {
        return data.map((_, index) => {
            if (index < window - 1) {
                return null;
            }
            let sum = 0;
            for (let k = index - window + 1; k <= index; k++) {
                if (data[k] == null) {
                    return null; // gap inside the window - can't average across a hole
                }
                sum += data[k];
            }
            return sum / window;
        });
    }
    static #exponentialMovingAverage(data, smoothing) {
        let previous = null;
        return data.map((value) => {
            if (value == null) {
                return previous;
            }
            previous = previous == null ? value : (smoothing * value + (1 - smoothing) * previous);
            return previous;
        });
    }
    /**
     * Local peaks/troughs of `data` (each strictly higher/lower than both immediate neighbors;
     * an edge point counts if it's higher/lower than its single neighbor). Returned as two
     * same-length arrays holding the value only at its own index and `null` everywhere else, so
     * they can be plotted directly as sparse marker-only Chart.js datasets (`showLine: false`).
     * @param {Array<number|null>} data
     * @returns {{peaks: Array<number|null>, troughs: Array<number|null>}}
     */
    static findExtrema(data) {
        const peaks = data.map(() => null);
        const troughs = data.map(() => null);
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            if (value == null) {
                continue;
            }
            const previous = i > 0 ? data[i - 1] : null;
            const next = i < data.length - 1 ? data[i + 1] : null;
            const higher_than_previous = previous == null || value > previous;
            const higher_than_next = next == null || value > next;
            const lower_than_previous = previous == null || value < previous;
            const lower_than_next = next == null || value < next;
            if (higher_than_previous && higher_than_next) {
                peaks[i] = value;
            } else if (lower_than_previous && lower_than_next) {
                troughs[i] = value;
            }
        }
        return { peaks, troughs };
    }
}
