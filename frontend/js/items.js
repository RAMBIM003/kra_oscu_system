const Items = {

    async getAll() {

        const response = await fetch(
            `/api/items?businessId=${encodeURIComponent(App.currentBusiness.id)}`,
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

        const response = await fetch("/api/items", {
            method: "POST",
            headers: Auth.headers(),
            body: JSON.stringify({
                businessId: App.currentBusiness.id,
                ...payload
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to create item");
        }

        return data.item;

    },

    async render() {

        const tbody = document.getElementById("items-table");

        try {

            const items = await this.getAll();

            if (!items.length) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="5">
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

        } catch (error) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        ${error.message}
                    </td>
                </tr>
            `;

        }

    }

};
