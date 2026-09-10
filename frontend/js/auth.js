const API = "";

const Auth = {

    token: localStorage.getItem("kra_token") || null,


    async login(email, password) {

        const response = await fetch(`${API}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Login failed");
        }

        this.token = data.token;

        localStorage.setItem(
            "kra_token",
            data.token
        );

        localStorage.setItem(
            "kra_user",
            JSON.stringify(data.user)
        );

        return data;
    },


    async register(email, password) {

        const response = await fetch(`${API}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Registration failed"
            );
        }

        return data;
    },


    async me() {

        const response = await fetch(`${API}/api/auth/me`, {
            headers: this.headers()
        });

        if (!response.ok) {
            this.logout();

            throw new Error(
                "Session expired"
            );
        }

        return response.json();
    },


    headers() {

        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.token}`
        };

    },


    logout() {

        this.token = null;

        localStorage.removeItem(
            "kra_token"
        );

        localStorage.removeItem(
            "kra_user"
        );

        location.reload();

    }

};


/* ============================================================
   UI ENHANCEMENTS
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* ------------------------------------------------------
           PASSWORD VISIBILITY TOGGLE
           ------------------------------------------------------ */

        document
            .querySelectorAll(".password-toggle")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            button.dataset.target;

                        const input =
                            document.getElementById(
                                targetId
                            );

                        if (!input) {
                            return;
                        }

                        const isPassword =
                            input.type === "password";

                        input.type =
                            isPassword
                                ? "text"
                                : "password";

                        button.innerHTML =
                            isPassword
                                ? '<i class="ph ph-eye-slash"></i>'
                                : '<i class="ph ph-eye"></i>';

                        button.setAttribute(
                            "aria-label",
                            isPassword
                                ? "Hide password"
                                : "Show password"
                        );

                    }
                );

            });


        /* ------------------------------------------------------
           AUTH IMAGE ROTATION
           1.jpg → 5 seconds → 2.jpg
           2.jpg → 5 seconds → 1.jpg
           ------------------------------------------------------ */

        document
            .querySelectorAll(".auth-visual")
            .forEach(visual => {

                const first =
                    visual.querySelector(
                        ".auth-image-one"
                    );

                const second =
                    visual.querySelector(
                        ".auth-image-two"
                    );

                if (!first || !second) {
                    return;
                }

                let showingFirst = true;

                first.style.opacity = "1";
                second.style.opacity = "0";

                setInterval(() => {

                    showingFirst =
                        !showingFirst;

                    if (showingFirst) {

                        first.style.opacity = "1";
                        second.style.opacity = "0";

                    } else {

                        first.style.opacity = "0";
                        second.style.opacity = "1";

                    }

                }, 5000);

            });

    }
);