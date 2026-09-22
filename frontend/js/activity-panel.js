const ActivityPanel = {

    _entity: "purchases",
    _rows: [],
    _chartMode: false,
    _tickerTimer: null,
    _tickerPaused: false,

    configs: {

        purchases: {
            label: "Purchases",
            columns: [
                { key: "invoice_number", label: "Invoice" },
                { key: "supplier_name", label: "Supplier" },
                { key: "transaction_date", label: "Date" },
                {
                    key: "total_amount",
                    label: "Amount",
                    format: v => `KES ${Number(v || 0).toLocaleString()}`
                },
                {
                    key: "_status",
                    label: "Status",
                    format: () => `<span class="status-badge">Synced</span>`
                }
            ],
            searchKeys: ["invoice_number", "supplier_name"],
            valueKey: "total_amount",
            labelKey: "supplier_name",
            async load() {
                return await Purchases.getAll();
            }
        },

        items: {
            label: "Items",
            columns: [
                { key: "item_code", label: "Item Code" },
                { key: "item_name", label: "Item Name" },
                {
                    key: "unit_price",
                    label: "Price",
                    format: v => `KES ${Number(v || 0).toLocaleString()}`
                },
                { key: "unit", label: "Unit" }
            ],
            searchKeys: ["item_code", "item_name"],
            valueKey: "unit_price",
            labelKey: "item_name",
            async load() {
                return await Items.getAll();
            }
        },

        branches: {
            label: "Branches",
            columns: [
                { key: "branch_name", label: "Branch Name" },
                { key: "branch_id", label: "Branch ID" },
                { key: "address", label: "Address" }
            ],
            searchKeys: ["branch_name", "branch_id"],
            valueKey: null,
            labelKey: "branch_name",
            async load() {
                return await Businesses.branches(
                    App.currentBusiness.id
                );
            }
        },

        payments: {
            label: "Payments",
            columns: [
                { key: "mpesa_receipt_no", label: "M-Pesa Receipt" },
                { key: "mpesa_recipient_name", label: "Recipient" },
                {
                    key: "amount",
                    label: "Amount",
                    format: v => `KES ${Number(v || 0).toLocaleString()}`
                },
                {
                    key: "status",
                    label: "Status",
                    format: v => `<span class="status-badge">${v === "matched" ? "Matched" : "Unmatched"}</span>`
                }
            ],
            searchKeys: ["mpesa_receipt_no", "mpesa_recipient_name"],
            valueKey: "amount",
            labelKey: "mpesa_recipient_name",
            async load() {
                return await Payments.getAll();
            }
        },

        transactions: {
            label: "Transactions",
            columns: [
                { key: "invoice_no", label: "Invoice" },
                { key: "kra_seller_name", label: "KRA Seller" },
                { key: "mpesa_recipient_name", label: "M-Pesa Recipient" },
                {
                    key: "amount",
                    label: "Amount",
                    format: v => `KES ${Number(v || 0).toLocaleString()}`
                },
                {
                    key: "status",
                    label: "Status",
                    format: v => `<span class="status-badge">${v === "matched" ? "Matched" : "Unmatched"}</span>`
                }
            ],
            searchKeys: ["invoice_no", "kra_seller_name"],
            valueKey: "amount",
            labelKey: "kra_seller_name",
            async load() {
                return await Transactions.getAll();
            }
        }

    },

    async init() {

        this.wireTabs();
        this.wireControls();
        await this.loadEntity(this._entity);

    },

    wireTabs() {

        const tabs = document.getElementById("activity-tabs");

        if (!tabs || tabs._wired) return;

        tabs._wired = true;

        tabs.querySelectorAll(".activity-tab").forEach(btn => {

            btn.addEventListener("click", () => {

                tabs.querySelectorAll(".activity-tab").forEach(
                    b => b.classList.remove("active")
                );

                btn.classList.add("active");

                this.loadEntity(btn.dataset.entity);

            });

        });

    },

    wireControls() {

        const search = document.getElementById("activity-search");

        if (search && !search._wired) {

            search._wired = true;

            search.addEventListener("input", () => {
                this.render();
            });

        }

        const chartToggle =
            document.getElementById("activity-chart-toggle");

        if (chartToggle && !chartToggle._wired) {

            chartToggle._wired = true;

            chartToggle.addEventListener("click", () => {

                this._chartMode = !this._chartMode;
                chartToggle.classList.toggle(
                    "active", this._chartMode
                );

                this.render();

            });

        }

        const downloadBtn =
            document.getElementById("activity-download-btn");

        if (downloadBtn && !downloadBtn._wired) {

            downloadBtn._wired = true;

            downloadBtn.addEventListener(
                "click",
                () => this.downloadCsv()
            );

        }

    },

    async loadEntity(entity) {

        this._entity = entity;
        this._chartMode = false;

        const chartToggle =
            document.getElementById("activity-chart-toggle");

        if (chartToggle) chartToggle.classList.remove("active");

        const search = document.getElementById("activity-search");
        if (search) search.value = "";

        const tbody = document.getElementById("activity-table-body");

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td class="table-empty-cell">
                        <div class="skeleton" style="height:20px;"></div>
                    </td>
                </tr>
            `;
        }

        try {

            const config = this.configs[entity];
            this._rows = await config.load() || [];
            this.render();
            this.startTicker();

        } catch (error) {

            console.error(error);

            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td class="table-empty-cell">
                            ${error.message}
                        </td>
                    </tr>
                `;
            }

        }

    },

    getFiltered() {

        const config = this.configs[this._entity];
        const search = document.getElementById("activity-search");
        const term = (search?.value || "").trim().toLowerCase();

        if (!term) return this._rows;

        return this._rows.filter(row =>
            config.searchKeys.some(key =>
                String(row[key] || "")
                    .toLowerCase()
                    .includes(term)
            )
        );

    },

    render() {

        if (this._chartMode) {
            this.renderChartView();
        } else {
            this.renderTableView();
        }

    },

    renderTableView() {

        const config = this.configs[this._entity];
        const thead = document.getElementById("activity-table-head");
        const tbody = document.getElementById("activity-table-body");
        const chartView =
            document.getElementById("activity-chart-view");
        const wrapper = document.getElementById("ticker-wrapper");

        if (!thead || !tbody) return;

        if (chartView) chartView.classList.add("hidden");
        if (wrapper) {
            wrapper.querySelector("table").style.display = "";
        }

        thead.innerHTML = `
            <tr>
                ${config.columns.map(c => `<th>${c.label}</th>`).join("")}
            </tr>
        `;

        const rows = this.getFiltered();

        if (!rows.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="${config.columns.length}"
                        class="table-empty-cell"
                    >
                        No ${config.label.toLowerCase()} found.
                    </td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = rows.map(row => `
            <tr>
                ${config.columns.map(c => `
                    <td>${
                        c.format ?
                            c.format(row[c.key]) :
                            (row[c.key] ?? "-")
                    }</td>
                `).join("")}
            </tr>
        `).join("");

    },

    renderChartView() {

        const config = this.configs[this._entity];
        const chartView =
            document.getElementById("activity-chart-view");
        const wrapper = document.getElementById("ticker-wrapper");

        if (!chartView) return;

        if (wrapper) {
            const table = wrapper.querySelector("table");
            if (table) table.style.display = "none";
        }

        chartView.classList.remove("hidden");

        if (!config.valueKey) {

            chartView.innerHTML = `
                <div class="activity-empty">
                    No numeric chart available for
                    ${config.label.toLowerCase()}.
                </div>
            `;

            return;

        }

        const rows = this.getFiltered().slice(0, 8);

        if (!rows.length) {

            chartView.innerHTML = `
                <div class="activity-empty">
                    No data to chart.
                </div>
            `;

            return;

        }

        const max = Math.max(
            ...rows.map(r => Number(r[config.valueKey] || 0)),
            1
        );

        chartView.innerHTML = `
            <div class="mini-bar-chart">
                ${rows.map(row => {

                    const value = Number(row[config.valueKey] || 0);
                    const pct = (value / max) * 100;
                    const label = row[config.labelKey] || "-";

                    return `
                        <div class="mini-bar-row">
                            <div
                                class="mini-bar-label"
                                title="${label}"
                            >${label}</div>
                            <div class="mini-bar-track">
                                <div
                                    class="mini-bar-fill"
                                    style="width:${pct}%"
                                ></div>
                            </div>
                            <div class="mini-bar-value">
                                ${value.toLocaleString()}
                            </div>
                        </div>
                    `;

                }).join("")}
            </div>
        `;

    },

    downloadCsv() {

        const config = this.configs[this._entity];
        const rows = this.getFiltered();

        if (!rows.length) {
            if (window.Toast) {
                Toast.info("No data to download");
            }
            return;
        }

        const headers = config.columns
            .filter(c => c.key !== "_status")
            .map(c => c.label);

        const keys = config.columns
            .filter(c => c.key !== "_status")
            .map(c => c.key);

        const escapeCsv = (value) => {
            const str = String(value ?? "");
            if (str.includes(",") || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const lines = [
            headers.join(","),
            ...rows.map(row =>
                keys.map(k => escapeCsv(row[k])).join(",")
            )
        ];

        const blob = new Blob(
            [lines.join("\n")],
            { type: "text/csv" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `${this._entity}-export.csv`;
        a.click();

        URL.revokeObjectURL(url);

        if (window.Toast) {
            Toast.success(`${config.label} exported`);
        }

    },

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

            if (this._tickerPaused || this._chartMode) return;

            const maxScroll =
                wrapper.scrollHeight - wrapper.clientHeight;

            if (maxScroll <= 0) return;

            if (wrapper.scrollTop >= maxScroll - 1) {
                wrapper.scrollTop = 0;
            } else {
                wrapper.scrollTop += 1;
            }

        }, 60);

    }

};

// Standalone reusable ticker (Items/Purchases pages call this
// directly after rendering their own table rows).
const tickerTimers = {};

function startGenericTicker(wrapperId) {

    const wrapper = document.getElementById(wrapperId);

    if (!wrapper) return;

    if (tickerTimers[wrapperId]) {
        clearInterval(tickerTimers[wrapperId]);
    }

    let paused = false;

    const pause = () => { paused = true; };
    const resume = () => { setTimeout(() => { paused = false; }, 1500); };

    if (!wrapper._wired) {

        wrapper._wired = true;

        wrapper.addEventListener("mouseenter", pause);
        wrapper.addEventListener("mouseleave", resume);
        wrapper.addEventListener("wheel", pause);
        wrapper.addEventListener("mousedown", pause);
        wrapper.addEventListener("touchstart", pause);
        wrapper.addEventListener("touchend", resume);

    }

    tickerTimers[wrapperId] = setInterval(() => {

        if (paused) return;

        const maxScroll = wrapper.scrollHeight - wrapper.clientHeight;

        if (maxScroll <= 0) return;

        if (wrapper.scrollTop >= maxScroll - 1) {
            wrapper.scrollTop = 0;
        } else {
            wrapper.scrollTop += 1;
        }

    }, 60);

}
