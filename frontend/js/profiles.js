const Profiles = {

    async getAll() {

        const response = await fetch("/api/profiles", {
            headers: Auth.headers()
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load profiles");
        }

        return data.profiles;

    },

    async create(profileName, profileType) {

        const response = await fetch("/api/profiles", {
            method: "POST",
            headers: Auth.headers(),
            body: JSON.stringify({
                profileName,
                profileType
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to create profile");
        }

        return data.profile;

    }

};
