const Businesses = {

    async getAll(profileId) {

        const response = await fetch(
            `/api/businesses?profileId=${encodeURIComponent(profileId)}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load businesses");
        }

        return data.businesses;

    },

    async create(payload) {

        const response = await fetch("/api/businesses", {
            method: "POST",
            headers: Auth.headers(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to create business");
        }

        return data.business;

    },

    async get(id) {

        const response = await fetch(`/api/businesses/${id}`, {
            headers: Auth.headers()
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load business");
        }

        return data.business;

    },

    async branches(businessId) {

        const response = await fetch(
            `/api/branches?businessId=${encodeURIComponent(businessId)}`,
            {
                headers: Auth.headers()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load branches");
        }

        return data.branches;

    }

};
