const Payments = {

    async getAll() {

        const response = await fetch(
            `/api/payments?businessId=${encodeURIComponent(App.currentBusiness.id)}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load payments");
        }

        return data.payments;

    },

    async render() {

        const tbody = document.getElementById("payments-table");

        if (!tbody) return;

        try {

            const payments = await this.getAll();

            if (!payments.length) {

                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="table-empty-cell">
                            No payments captured yet. Payments
                            arrive automatically once M-Pesa SMS
                            forwarding is connected.
                        </td>
                    </tr>
                `;

                return;

            }

            tbody.innerHTML = payments.map(payment => `

                <tr>

                    <td>${payment.mpesa_receipt_no || "-"}</td>

                    <td>${payment.mpesa_recipient_name || "-"}</td>

                    <td>
                        KES ${Number(
                            payment.amount || 0
                        ).toLocaleString()}
                    </td>

                    <td>
                        ${payment.payment_time ?
                            new Date(payment.payment_time)
                                .toLocaleString() :
                            "-"}
                    </td>

                    <td>
                        <span class="status-pill status-pill-${payment.status}">
                            ${payment.status === "matched" ?
                                "Matched" :
                                "Unmatched"}
                        </span>
                    </td>

                </tr>

            `).join("");

        } catch (error) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-cell">
                        ${error.message}
                    </td>
                </tr>
            `;

        }

    }

};
