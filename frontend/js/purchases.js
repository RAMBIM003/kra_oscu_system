const Purchases = {

    _lastData: [],

    async sync() {

        const status = document.getElementById("purchase-status");

        status.classList.remove("hidden");

        status.textContent =
            "Connecting to KRA eTIMS and checking for new purchases...";

        try {

            const response = await fetch("/api/purchases", {
                method: "POST",
                headers: Auth.headers(),
                body: JSON.stringify({
                    businessId: App.currentBusiness.id
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Purchase synchronization failed"
                );
            }

            const count =
                data.count ??
                (data.purchases || data.records || []).length;

            status.textContent =
                `Synchronization complete. ${count} purchase record(s) received.`;

            await this.render();

            if (window.Toast) {
                Toast.success(
                    `${count} purchase record(s) synchronized`
                );
            }

            if (window.Dashboard) {
                await Dashboard.load();
            }

        } catch (error) {

            console.error(error);

            status.textContent =
                `Sync failed: ${error.message}`;

            if (window.Toast) {
                Toast.error(`Sync failed: ${error.message}`);
            }

        }

    },

    async getAll() {

        const response = await fetch(
            `/api/purchases/${App.currentBusiness.id}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load purchases"
            );
        }

        return data.purchases || [];

    },

    renderRows(items) {

        const tbody =
            document.getElementById("purchases-table-body");

        if (!tbody) return;

        if (!items.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-cell">
                        No purchase transactions found.
                    </td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = items.map(item => `

            <tr>

                <td>
                    ${item.invoice_number ||
                      item.invoice_no ||
                      item.invoiceNo ||
                      item.spplrInvcNo ||
                      "-"}
                </td>

                <td>
                    ${item.supplier_name ||
                      item.supplierName ||
                      item.spplrNm ||
                      item.customer_name ||
                      "-"}
                </td>

                <td>
                    ${item.transaction_date ||
                      item.transactionDate ||
                      item.salesDt ||
                      "-"}
                </td>

                <td>
                    KES ${Number(
                        item.total_amount ||
                        item.totalAmount ||
                        item.totAmt ||
                        item.amount ||
                        0
                    ).toLocaleString()}
                </td>

                <td>
                    <span class="status-badge">
                        Synced
                    </span>
                </td>

            </tr>

        `).join("");

    },

    async render() {

        const tbody =
            document.getElementById("purchases-table-body");

        if (!tbody) return;

        try {

            this._lastData = await this.getAll();
            this.renderRows(this._lastData);
            this.wireSearch();

            if (typeof startGenericTicker === "function") {
                startGenericTicker("purchases-ticker-wrapper");
            }

        } catch (error) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-cell">
                        ${error.message}
                    </td>
                </tr>
            `;

        }

    },

    wireSearch() {

        const input = document.getElementById("purchases-search");

        if (!input || input._wired) return;

        input._wired = true;

        input.addEventListener("input", () => {

            const term = input.value.trim().toLowerCase();

            if (!term) {
                this.renderRows(this._lastData);
                return;
            }

            const filtered = this._lastData.filter(item => {

                const invoice = String(
                    item.invoice_number || item.invoice_no || ""
                ).toLowerCase();

                const supplier = String(
                    item.supplier_name || ""
                ).toLowerCase();

                return invoice.includes(term) ||
                    supplier.includes(term);

            });

            this.renderRows(filtered);

        });

    }

};
