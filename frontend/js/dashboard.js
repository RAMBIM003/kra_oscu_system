const Dashboard = {

    _lastData: null,
    _currentPeriod: "30d",
    _activityRotateTimer: null,

    relativeTime(value) {

        if (!value) return "never";

        const then = new Date(value).getTime();

        if (isNaN(then)) return "never";

        const diffMs = Date.now() - then;
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return "just now";
        if (diffMin < 60) return `${diffMin} min ago`;

        const diffHr = Math.floor(diffMin / 60);

        if (diffHr < 24) return `${diffHr} hr ago`;

        const diffDay = Math.floor(diffHr / 24);

        return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

    },

    renderSparkline(containerId, values, color) {

        const container = document.getElementById(containerId);

        if (!container) return;

        const data = (values || []).map(v => Number(v || 0));

        if (!data.length || data.every(v => v === 0)) {
            container.innerHTML = "";
            return;
        }

        const width = 100;
        const height = 32;
        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;

        const points = data.map((v, i) => {
            const x = (i / (data.length - 1 || 1)) * width;
            const y = height - ((v - min) / range) * (height - 4) - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");

        container.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <polyline
                    points="${points}"
                    fill="none"
                    stroke="${color}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                ></polyline>
            </svg>
        `;

    },

    renderDonut(matched, unmatched) {

        const total = matched + unmatched;
        const pct = total > 0 ? (matched / total) * 100 : 0;

        const circumference = 314;
        const offset = circumference - (pct / 100) * circumference;

        const progress = document.getElementById("donut-progress");
        if (progress) {
            progress.style.strokeDashoffset = offset;
        }

        const pctEl = document.getElementById("donut-pct");
        if (pctEl) pctEl.textContent = `${pct.toFixed(0)}%`;

        const matchedEl =
            document.getElementById("donut-matched-count");
        if (matchedEl) matchedEl.textContent = matched;

        const unmatchedEl =
            document.getElementById("donut-unmatched-count");
        if (unmatchedEl) unmatchedEl.textContent = unmatched;

    },

    renderSuppliers(rows) {

        const container =
            document.getElementById("suppliers-bar-chart");

        if (!container) return;

        if (!rows || !rows.length) {

            container.innerHTML = `
                <div class="activity-empty">
                    No supplier data yet.
                </div>
            `;

            return;

        }

        const max = Math.max(
            ...rows.map(r => Number(r.total || 0)),
            1
        );

        container.innerHTML = rows.map(row => {

            const value = Number(row.total || 0);
            const widthPct = (value / max) * 100;

            return `
                <div class="supplier-bar-row">
                    <div
                        class="supplier-bar-name"
                        title="${row.supplier_name || "-"}"
                    >${row.supplier_name || "-"}</div>
                    <div class="supplier-bar-track">
                        <div
                            class="supplier-bar-fill"
                            style="width:${widthPct}%"
                        ></div>
                    </div>
                    <div class="supplier-bar-value">
                        KES ${value.toLocaleString()}
                    </div>
                </div>
            `;

        }).join("");

    },

    _tickerTimer: null,
    _tickerPaused: false,

    startTicker() {

        const wrapper = document.getElementById("ticker-wrapper");

        if (!wrapper) return;

        if (this._tickerTimer) {
            clearInterval(this._tickerTimer);
        }

        const pause = () => { this._tickerPaused = true; };

        const resume = () => {
            setTimeout(() => {
                this._tickerPaused = false;
            }, 1500);
        };

        if (!wrapper._wired) {

            wrapper._wired = true;

            wrapper.addEventListener("mouseenter", pause);
            wrapper.addEventListener("mouseleave", resume);
            wrapper.addEventListener("wheel", pause);
            wrapper.addEventListener("mousedown", pause);
            wrapper.addEventListener("touchstart", pause);
            wrapper.addEventListener("touchend", resume);

        }

        this._tickerTimer = setInterval(() => {

            if (this._tickerPaused) return;

            const maxScroll =
                wrapper.scrollHeight - wrapper.clientHeight;

            if (maxScroll <= 0) return;

            if (wrapper.scrollTop >= maxScroll - 1) {
                wrapper.scrollTop = 0;
            } else {
                wrapper.scrollTop += 1;
            }

        }, 60);

    },

    renderRelativeTimestamps() {

        document.querySelectorAll(
            "[data-relative-time]"
        ).forEach(el => {

            el.textContent = this.relativeTime(
                el.dataset.relativeTime
            );

        });

    },

    startClock() {

        const dateEl = document.getElementById("topbar-date");
        const timeEl = document.getElementById("topbar-time");

        if (!dateEl || !timeEl) return;

        const tick = () => {

            const now = new Date();

            dateEl.textContent = now.toLocaleDateString(
                "en-GB",
                {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

            timeEl.textContent = now.toLocaleTimeString(
                "en-GB",
                { hour: "2-digit", minute: "2-digit" }
            );

        };

        tick();
        setInterval(tick, 30000);

    },

    renderTrend(rowId, pctId, pct) {

        const row = document.getElementById(rowId);
        const pctEl = document.getElementById(pctId);

        if (!row || !pctEl) return;

        const value = Number(pct || 0);

        row.classList.toggle("trend-down", value < 0);

        const icon = row.querySelector("i");
        if (icon) {
            icon.className =
                value < 0 ? "ph ph-arrow-down" : "ph ph-arrow-up";
        }

        pctEl.textContent = `${Math.abs(value).toFixed(1)}%`;

    },

    renderChart(currentRows, previousRows, period) {

        const container =
            document.getElementById("purchase-chart");

        const legendPrevious =
            document.getElementById("chart-legend-previous");

        if (!container) return;

        const current = currentRows || [];
        const previous = previousRows || [];
        const showComparison =
            period !== "12m" && previous.length > 0;

        if (legendPrevious) {
            legendPrevious.style.display =
                showComparison ? "flex" : "none";
        }

        const trendEl = document.getElementById("chart-trend");

        if (!current.length) {

            container.innerHTML = `
                <div class="chart-empty">
                    No purchase activity recorded
                    for this period.
                </div>
            `;

            const totalEl =
                document.getElementById("chart-total-value");

            if (totalEl) totalEl.textContent = "KES 0";
            if (trendEl) trendEl.style.visibility = "hidden";

            return;

        }

        const currentTotal = current.reduce(
            (sum, row) => sum + Number(row.total || 0),
            0
        );

        const previousTotal = previous.reduce(
            (sum, row) => sum + Number(row.total || 0),
            0
        );

        document.getElementById(
            "chart-total-value"
        ).textContent =
            `KES ${currentTotal.toLocaleString()}`;

        if (trendEl) {

            if (showComparison) {

                trendEl.style.visibility = "visible";

                const pct = previousTotal === 0 ?
                    (currentTotal > 0 ? 100 : 0) :
                    (((currentTotal - previousTotal) / previousTotal) * 100);

                this.renderTrend(
                    "chart-trend",
                    "chart-trend-pct",
                    pct
                );

            } else {
                trendEl.style.visibility = "hidden";
            }

        }

        const max = Math.max(
            ...current.map(row => Number(row.total || 0)),
            ...previous.map(row => Number(row.total || 0)),
            1
        );

        const width = 700;
        const height = 180;
        const barGap = 6;
        const groupWidth =
            (width / current.length) - barGap;

        const barWidth = showComparison ?
            (groupWidth - 3) / 2 :
            groupWidth;

        const formatLabel = (bucket) => {

            if (period === "12m") {

                const parts = String(bucket).split("-");

                return new Date(
                    Number(parts[0]),
                    Number(parts[1]) - 1,
                    1
                ).toLocaleDateString(
                    "en-GB",
                    { month: "short" }
                );

            }

            return new Date(bucket).toLocaleDateString(
                "en-GB",
                { day: "numeric", month: "short" }
            );

        };

        const bars = current.map((row, i) => {

            const bucketKey = row.day || row.bucket;
            const value = Number(row.total || 0);

            const barHeight =
                Math.max((value / max) * (height - 24), 2);

            const groupX = i * (groupWidth + barGap);
            const y = height - barHeight;

            const label = formatLabel(bucketKey);

            let previousBar = "";

            if (showComparison) {

                const prevRow = previous[i] || {};
                const prevValue = Number(prevRow.total || 0);

                const prevHeight =
                    Math.max((prevValue / max) * (height - 24), 2);

                const prevY = height - prevHeight;

                previousBar = `
                    <rect
                        x="${groupX + barWidth + 3}"
                        y="${prevY}"
                        width="${barWidth}"
                        height="${prevHeight}"
                        rx="3"
                        class="chart-bar chart-bar-previous"
                    >
                        <title>Previous: KES ${prevValue.toLocaleString()}</title>
                    </rect>
                `;

            }

            return `
                <g class="chart-bar-group">
                    <rect
                        x="${groupX}"
                        y="${y}"
                        width="${barWidth}"
                        height="${barHeight}"
                        rx="3"
                        class="chart-bar"
                    >
                        <title>${label}: KES ${value.toLocaleString()}</title>
                    </rect>
                    ${previousBar}
                    <text
                        x="${groupX + groupWidth / 2}"
                        y="${height + 14}"
                        class="chart-bar-label"
                        text-anchor="middle"
                    >${label}</text>
                </g>
            `;

        }).join("");

        container.innerHTML = `
            <svg
                viewBox="0 0 ${width} ${height + 24}"
                preserveAspectRatio="none"
                class="chart-svg"
            >
                ${bars}
            </svg>
        `;

    },

    async loadChart(period) {

        this._currentPeriod = period;

        const subtitleMap = {
            "7d": "Daily purchase trend - last 7 days",
            "30d": "Daily purchase trend - last 30 days",
            "12m": "Monthly purchase trend - last 12 months"
        };

        const subtitle =
            document.getElementById("chart-subtitle");

        if (subtitle) {
            subtitle.textContent =
                subtitleMap[period] || subtitleMap["30d"];
        }

        try {

            const response = await fetch(
                `/api/dashboard/${App.currentBusiness.id}/chart?period=${period}`,
                { headers: Auth.headers() }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load chart"
                );
            }

            this.renderChart(
                data.current,
                data.previous,
                period
            );

        } catch (error) {

            console.error(error);

            const container =
                document.getElementById("purchase-chart");

            if (container) {
                container.innerHTML = `
                    <div class="chart-empty">
                        ${error.message}
                    </div>
                `;
            }

        }

    },

    wireChartToggle() {

        const toggle =
            document.getElementById("chart-period-toggle");

        if (!toggle || toggle._wired) return;

        toggle._wired = true;

        toggle.querySelectorAll(
            ".chart-period-btn"
        ).forEach(btn => {

            btn.addEventListener("click", () => {

                toggle.querySelectorAll(
                    ".chart-period-btn"
                ).forEach(b => b.classList.remove("active"));

                btn.classList.add("active");

                this.loadChart(btn.dataset.period);

            });

        });

    },

    renderConnection(connection) {

        if (!connection) return;

        const kraDotEl =
            document.querySelector(
                "#connection-kra-status .status-dot"
            );

        const kraLabelMap = {
            connected: ["status-dot-connected", "Connected"],
            pending: ["status-dot-pending", "Pending"],
            error: ["status-dot-failed", "Connection error"]
        };

        const [kraClass, kraLabel] =
            kraLabelMap[connection.kra_status] ||
            kraLabelMap.pending;

        if (kraDotEl) {
            kraDotEl.className = `status-dot ${kraClass}`;
        }

        const kraStatusRow =
            document.getElementById("connection-kra-status");

        if (kraStatusRow) {
            kraStatusRow.lastChild.textContent = ` ${kraLabel}`;
        }

        document.getElementById(
            "connection-kra-meta"
        ).innerHTML =
            `Last sync <span data-relative-time="${connection.kra_last_sync || ""}">${this.relativeTime(connection.kra_last_sync)}</span>`;

        const mpesaDotEl =
            document.querySelector(
                "#connection-mpesa-status .status-dot"
            );

        const mpesaActive =
            connection.mpesa_status === "active";

        if (mpesaDotEl) {
            mpesaDotEl.className =
                `status-dot ${mpesaActive ? "status-dot-active" : "status-dot-pending"}`;
        }

        const mpesaStatusRow =
            document.getElementById("connection-mpesa-status");

        if (mpesaStatusRow) {
            mpesaStatusRow.lastChild.textContent =
                ` ${mpesaActive ? "Active" : "Awaiting data"}`;
        }

        document.getElementById(
            "connection-mpesa-meta"
        ).textContent =
            mpesaActive ?
                "Receiving payments" :
                "No payments captured yet";

        const payDotEl =
            document.querySelector(
                "#stat-payments-status .status-dot"
            );

        const payStatusRow =
            document.getElementById("stat-payments-status");

        if (payDotEl && payStatusRow) {
            payDotEl.className =
                `status-dot ${mpesaActive ? "status-dot-active" : "status-dot-pending"}`;
            payStatusRow.lastChild.textContent =
                ` ${mpesaActive ? "Active" : "Awaiting data"}`;
        }

    },

    async load() {

        this.startClock();

        const chartEl = document.getElementById("purchase-chart");

        if (chartEl) {
            chartEl.innerHTML =
                '<div class="skeleton" style="height:180px;width:100%;"></div>';
        }

        try {

            const response = await fetch(
                `/api/dashboard/${App.currentBusiness.id}`,
                { headers: Auth.headers() }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load dashboard"
                );
            }

            this._lastData = data;

            const summary = data.summary || {};

            document.getElementById("stat-purchases").textContent =
                summary.purchase_count ?? 0;

            document.getElementById(
                "stat-purchases-today"
            ).textContent =
                `${summary.purchase_today ?? 0} today`;

            document.getElementById(
                "stat-purchase-sync"
            ).textContent =
                data.connection?.kra_last_sync ?
                    `synced ${this.relativeTime(data.connection.kra_last_sync)}` :
                    "not yet synced";

            document.getElementById(
                "stat-purchase-amount"
            ).textContent =
                `KES ${Number(summary.purchase_total || 0).toLocaleString()}`;

            this.renderTrend(
                "stat-purchase-trend",
                "stat-purchase-trend-pct",
                summary.purchase_trend_pct
            );

            document.getElementById("stat-payments").textContent =
                summary.payment_count ?? 0;

            document.getElementById(
                "stat-payments-total"
            ).textContent =
                `KES ${Number(summary.payment_total || 0).toLocaleString()}`;

            this.renderTrend(
                "stat-payments-trend",
                "stat-payments-trend-pct",
                summary.payment_trend_pct
            );

            document.getElementById("stat-branches").textContent =
                summary.branch_count ?? 0;

            document.getElementById("stat-items").textContent =
                summary.item_count ?? 0;

            document.getElementById("stat-transactions").textContent =
                summary.transaction_matched ?? 0;

            document.getElementById(
                "stat-transactions-label"
            ).textContent =
                `${summary.transaction_matched ?? 0} matched · ${summary.transaction_unmatched ?? 0} unmatched`;

            document.getElementById("pipeline-purchases").textContent =
                summary.purchase_count ?? 0;

            document.getElementById("pipeline-payments").textContent =
                summary.payment_count ?? 0;

            document.getElementById("pipeline-matched").textContent =
                summary.transaction_matched ?? 0;

            document.getElementById("pipeline-unmatched").textContent =
                summary.transaction_unmatched ?? 0;

            this.renderConnection(data.connection);

            this.renderDonut(
                summary.transaction_matched ?? 0,
                summary.transaction_unmatched ?? 0
            );

            this.renderSuppliers(data.topSuppliers || []);

            this.renderSparkline(
                "sparkline-purchases",
                (data.chart || []).slice(-7).map(r => r.count),
                "#dc2626"
            );

            this.renderSparkline(
                "sparkline-payments",
                (data.paymentChart || []).map(r => r.total),
                "#0d9488"
            );

            this.wireChartToggle();
            await this.loadChart(this._currentPeriod);

            if (window.ActivityPanel) {
                ActivityPanel.init();
            }

        } catch (error) {

            console.error(error);

            if (window.Toast) {
                Toast.error(
                    `Dashboard failed to load: ${error.message}`
                );
            }

        }

    }

};

setInterval(() => {
    Dashboard.renderRelativeTimestamps();
}, 30000);
