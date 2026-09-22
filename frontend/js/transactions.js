const Transactions = {

    async getAll() {

        const response = await fetch(
            `/api/transactions/${App.currentBusiness.id}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to load transactions"
            );
        }

        return data.transactions;

    },

    async rematch() {

        const response = await fetch(
            `/api/transactions/${App.currentBusiness.id}/rematch`,
            {
                method: "POST",
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Re-match failed");
        }

        return data;

    },

    renderStats(transactions) {

        const matched =
            transactions.filter(
                t => t.status === "matched"
            ).length;

        const unmatched =
            transactions.length - matched;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set("stat-txn-total", transactions.length);
        set("stat-txn-matched", matched);
        set("stat-txn-unmatched", unmatched);

    },

    async render() {

        const tbody =
            document.getElementById("transactions-table-body");

        if (!tbody) return;

        try {

            const transactions = await this.getAll();

            this.renderStats(transactions);

            if (!transactions.length) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="table-empty-cell">
                            No transactions yet. Sync Purchases
                            to pull KRA records - matching runs
                            automatically against captured
                            M-Pesa payments.
                        </td>
                    </tr>
                `;

                return;

            }

            tbody.innerHTML = transactions.map(txn => `

                <tr>

                    <td>${txn.invoice_no || "-"}</td>

                    <td>${txn.kra_seller_name || "-"}</td>

                    <td>${txn.invoice_date || "-"}</td>

                    <td>
                        KES ${Number(
                            txn.taxable_amt || 0
                        ).toLocaleString()}
                    </td>

                    <td>
                        KES ${Number(
                            txn.vat_amt || 0
                        ).toLocaleString()}
                    </td>

                    <td>${txn.mpesa_receipt_no || "-"}</td>

                    <td>${txn.mpesa_recipient_name || "-"}</td>

                    <td>
                        ${txn.payment_time ?
                            new Date(txn.payment_time)
                                .toLocaleString() :
                            "-"}
                    </td>

                    <td>
                        <span class="status-pill status-pill-${txn.status}">
                            ${txn.status === "matched" ?
                                "Matched" :
                                "Unmatched"}
                        </span>
                    </td>

                </tr>

            `).join("");

        } catch (error) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-empty-cell">
                        ${error.message}
                    </td>
                </tr>
            `;

        }

    }

};
