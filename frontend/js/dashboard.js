const Dashboard = {

    async load() {

        if (!App.currentBusiness) return;

        try {

            const response = await fetch(
                `/api/dashboard/${App.currentBusiness.id}`,
                {
                    headers: Auth.headers()
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load dashboard"
                );
            }

            this.render(data);

        } catch (error) {

            console.error("Dashboard error:", error);

        }

    },

    render(data) {

        const summary = data.summary || {};

        document.getElementById("stat-purchases").textContent =
            summary.purchase_count ?? 0;

        document.getElementById("stat-purchase-amount").textContent =
            `KES ${Number(summary.purchase_total || 0).toLocaleString()}`;

        document.getElementById("stat-sales").textContent =
            summary.sale_count ?? 0;

        document.getElementById("stat-items").textContent =
            summary.item_count ?? 0;

        const recent =
            data.recentPurchases ||
            data.recent_purchases ||
            [];

        const container =
            document.getElementById("recent-purchases");

        if (!recent.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>No recent purchases.</p>
                </div>
            `;

            return;

        }

        container.innerHTML = recent
            .slice(0, 6)
            .map(item => `
                <div class="recent-item">

                    <strong>
                        ${item.supplier_name || item.supplierName || "Purchase"}
                    </strong>

                    <span>
                        ${item.transaction_date || item.transactionDate || ""}
                        ·
                        KES ${Number(
                            item.total_amount ||
                            item.totalAmount ||
                            0
                        ).toLocaleString()}
                    </span>

                </div>
            `)
            .join("");

    }

};
