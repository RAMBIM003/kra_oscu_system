const Purchases = {

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

            const purchases =
                data.purchases ||
                data.records ||
                [];

            status.textContent =
                `Synchronization complete. ${purchases.length} purchase record(s) received.`;

            this.render(purchases);

            await Dashboard.load();

        } catch (error) {

            console.error(error);

            status.textContent =
                `Sync failed: ${error.message}`;

        }

    },

    render(purchases) {

        const tbody =
            document.getElementById("purchases-table");

        if (!purchases.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No purchase transactions found.
                    </td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = purchases.map(item => `

            <tr>

                <td>
                    ${item.invoice_no ||
                      item.invoiceNo ||
                      item.transaction_no ||
                      "-"}
                </td>

                <td>
                    ${item.supplier_name ||
                      item.supplierName ||
                      item.customer_name ||
                      "-"}
                </td>

                <td>
                    ${item.transaction_date ||
                      item.transactionDate ||
                      "-"}
                </td>

                <td>
                    KES ${Number(
                        item.total_amount ||
                        item.totalAmount ||
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

    }

};
