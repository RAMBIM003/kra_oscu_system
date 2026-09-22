const Items = {

    _lastData: [],

    async getAll() {

        const response = await fetch(
            `/api/items/business/${encodeURIComponent(App.currentBusiness.id)}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load items");
        }

        return data.items;

    },

    async create(payload) {

        const response = await fetch(
            `/api/items/business/${App.currentBusiness.id}`,
            {
                method: "POST",
                headers: Auth.headers(),
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to create item");
        }

        return data.item;

    },

    async sync() {

        const response = await fetch("/api/items/sync", {
            method: "POST",
            headers: Auth.headers(),
            body: JSON.stringify({
                businessId: App.currentBusiness.id
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Item synchronization failed"
            );
        }

        if (window.Toast) {
            Toast.success(
                `${data.count ?? 0} item(s) synchronized`
            );
        }

        if (window.Dashboard) {
            await Dashboard.load();
        }

        return data;

    },

    renderRows(items) {

        const tbody = document.getElementById("items-table-body");

        if (!tbody) return;

        if (!items.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-cell">
                        No items found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = items.map(item => `

            <tr>

                <td>${item.item_code || "-"}</td>

                <td>${item.item_name || "-"}</td>

                <td>${item.category || "-"}</td>

                <td>${item.unit || "-"}</td>

                <td>
                    KES ${Number(
                        item.unit_price || item.price || 0
                    ).toLocaleString()}
                </td>

            </tr>

        `).join("");

    },

    async render() {

        const tbody = document.getElementById("items-table-body");

        if (!tbody) return;

        try {

            this._lastData = await this.getAll();
            this.renderRows(this._lastData);
            this.wireSearch();

            if (typeof startGenericTicker === "function") {
                startGenericTicker("items-ticker-wrapper");
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

        const input = document.getElementById("items-search");

        if (!input || input._wired) return;

        input._wired = true;

        input.addEventListener("input", () => {

            const term = input.value.trim().toLowerCase();

            if (!term) {
                this.renderRows(this._lastData);
                return;
            }

            const filtered = this._lastData.filter(item => {

                const code = String(
                    item.item_code || ""
                ).toLowerCase();

                const name = String(
                    item.item_name || ""
                ).toLowerCase();

                return code.includes(term) ||
                    name.includes(term);

            });

            this.renderRows(filtered);

        });

    }

};
