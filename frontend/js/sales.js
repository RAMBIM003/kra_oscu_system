const Sales = {

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
                return;
            }

            const sales =
                data.recentSales ||
                data.recent_sales ||
                [];

            console.log("Sales:", sales);

        } catch (error) {

            console.error("Sales error:", error);

        }

    }

};
