const Theme = {

    STORAGE_KEY: "kra-theme-preference",

    get() {

        try {
            return localStorage.getItem(this.STORAGE_KEY) || "system";
        } catch (error) {
            return "system";
        }

    },

    set(value) {

        try {
            localStorage.setItem(this.STORAGE_KEY, value);
        } catch (error) {
            // Storage unavailable - theme just won't persist.
        }

        this.apply(value);
        this.syncToggleUI(value);

    },

    apply(value) {

        const root = document.documentElement;

        if (value === "system") {
            root.removeAttribute("data-theme");
        } else {
            root.setAttribute("data-theme", value);
        }

    },

    // Renders a sun/moon/system toggle into any container with
    // id="theme-toggle-mount", if one exists on the page.
    renderToggle() {

        const mount =
            document.getElementById("theme-toggle-mount");

        if (!mount) return;

        mount.innerHTML = `
            <div class="theme-toggle" id="theme-toggle">
                <button
                    type="button"
                    class="theme-toggle-option"
                    data-theme-value="system"
                    title="Match system"
                >
                    <i class="ph ph-monitor"></i>
                </button>
                <button
                    type="button"
                    class="theme-toggle-option"
                    data-theme-value="light"
                    title="Light"
                >
                    <i class="ph ph-sun"></i>
                </button>
                <button
                    type="button"
                    class="theme-toggle-option"
                    data-theme-value="dark"
                    title="Dark"
                >
                    <i class="ph ph-moon"></i>
                </button>
            </div>
        `;

        mount.querySelectorAll(
            ".theme-toggle-option"
        ).forEach(btn => {

            btn.addEventListener("click", () => {
                this.set(btn.dataset.themeValue);
            });

        });

        this.syncToggleUI(this.get());

    },

    syncToggleUI(value) {

        const toggle = document.getElementById("theme-toggle");

        if (!toggle) return;

        toggle.querySelectorAll(
            ".theme-toggle-option"
        ).forEach(btn => {

            btn.classList.toggle(
                "active",
                btn.dataset.themeValue === value
            );

        });

    },

    init() {

        this.apply(this.get());

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                () => this.renderToggle()
            );
        } else {
            this.renderToggle();
        }

    }

};

// Apply immediately (before paint) to avoid a flash of the
// wrong theme, then render the toggle once the DOM is ready.
Theme.apply(Theme.get());
Theme.init();
