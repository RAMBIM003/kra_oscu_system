const App = {

    currentUser: null,
    currentProfile: null,
    currentBusiness: null,


    /* ==========================================================
       INITIALIZATION
       ========================================================== */

    async init() {

        this.currentUser =
            JSON.parse(
                localStorage.getItem(
                    "kra_user"
                ) || "null"
            );


        const page =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        /*
         * ======================================================
         * INDEX PAGE
         * ======================================================
         */

        if (
            page === "" ||
            page === "index.html"
        ) {

            this.bindIndexEvents();

            return;

        }


        /*
         * ======================================================
         * AUTHENTICATION CHECK
         * ======================================================
         */

        if (!Auth.token) {

            window.location.href =
                "/index.html";

            return;

        }


        /*
         * ======================================================
         * PROFILE PAGE
         * ======================================================
         */

        if (
            page === "profile.html"
        ) {

            this.bindProfileEvents();

            await this.showProfiles();

            return;

        }


        /*
         * ======================================================
         * BUSINESS PAGE
         * ======================================================
         */

        if (
            page === "business.html"
        ) {

            this.bindBusinessEvents();

            await this.restoreProfile();

            if (!this.currentProfile) {

                window.location.href =
                    "/profile.html";

                return;

            }

            await this.showBusinesses();

            return;

        }


        /*
         * ======================================================
         * MAIN APPLICATION
         * ======================================================
         */

        if (
            page === "app.html"
        ) {

            this.bindAppEvents();

            await this.restoreProfile();
            await this.restoreBusiness();

            if (
                !this.currentProfile ||
                !this.currentBusiness
            ) {

                window.location.href =
                    "/profile.html";

                return;

            }

            this.populateAppContext();

            const requestedPage =
                localStorage.getItem(
                    "kra_current_page"
                ) || "dashboard";

            await this.showPage(
                requestedPage,
                false
            );

            /*
             * Browser Back / Forward
             */
            window.addEventListener(
                "popstate",
                async () => {

                    const pageFromUrl =
                        this.getPageFromUrl();

                    await this.showPage(
                        pageFromUrl,
                        false
                    );

                }
            );

        }

    },


    /* ==========================================================
       PAGE DETECTION
       ========================================================== */

    getPageFromUrl() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        return (
            params.get("page") ||
            "dashboard"
        );

    },


    /* ==========================================================
       INDEX EVENTS
       ========================================================== */

    bindIndexEvents() {

        const loginForm =
            document.getElementById(
                "login-form"
            );

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                this.login.bind(this)
            );

        }


        const registerForm =
            document.getElementById(
                "register-form"
            );

        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                this.register.bind(this)
            );

        }


        const showRegister =
            document.getElementById(
                "show-register"
            );

        if (showRegister) {

            showRegister.addEventListener(
                "click",
                () => {

                    this.showScreen(
                        "register-screen"
                    );

                }
            );

        }


        const showLogin =
            document.getElementById(
                "show-login"
            );

        if (showLogin) {

            showLogin.addEventListener(
                "click",
                () => {

                    this.showScreen(
                        "login-screen"
                    );

                }
            );

        }

    },


    /* ==========================================================
       PROFILE EVENTS
       ========================================================== */

    bindProfileEvents() {

        const logout =
            document.getElementById(
                "profile-logout"
            );

        if (logout) {

            logout.addEventListener(
                "click",
                () => this.logout()
            );

        }


        const create =
            document.getElementById(
                "open-create-profile"
            );

        if (create) {

            create.addEventListener(
                "click",
                () => {

                    this.openModal(
                        "profile-modal"
                    );

                }
            );

        }


        const form =
            document.getElementById(
                "profile-form"
            );

        if (form) {

            form.addEventListener(
                "submit",
                this.createProfile.bind(this)
            );

        }


        document
            .querySelectorAll(
                ".close-modal"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.modal;

                        if (modalId) {

                            this.closeModal(
                                modalId
                            );

                        }

                    }
                );

            });

    },


    /* ==========================================================
       BUSINESS EVENTS
       ========================================================== */

    bindBusinessEvents() {

        const logout =
            document.getElementById(
                "business-logout"
            );

        if (logout) {

            logout.addEventListener(
                "click",
                () => this.logout()
            );

        }


        const create =
            document.getElementById(
                "open-create-business"
            );

        if (create) {

            create.addEventListener(
                "click",
                () => {

                    this.openModal(
                        "business-modal"
                    );

                }
            );

        }


        const createMpesa =
            document.getElementById(
                "open-create-mpesa"
            );

        if (createMpesa) {

            createMpesa.addEventListener(
                "click",
                () => {

                    const urlEl =
                        document.getElementById(
                            "mpesa-webhook-url"
                        );

                    if (urlEl) {

                        urlEl.textContent =
                            `POST ${window.location.origin}/api/payments/webhook`;

                    }

                    const idEl =
                        document.getElementById(
                            "mpesa-business-id"
                        );

                    if (idEl) {

                        const businesses =
                            document.querySelectorAll(
                                "#businesses-list .business-card"
                            );

                        idEl.textContent =
                            businesses.length ?
                                "<your business id>" :
                                "<add a business first>";

                    }

                    this.openModal(
                        "mpesa-modal"
                    );

                }
            );

        }


        const form =
            document.getElementById(
                "business-form"
            );

        if (form) {

            form.addEventListener(
                "submit",
                this.createBusiness.bind(this)
            );

        }


        document
            .querySelectorAll(
                ".close-modal"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.modal;

                        if (modalId) {

                            this.closeModal(
                                modalId
                            );

                        }

                    }
                );

            });

    },


    /* ==========================================================
       APP EVENTS
       ========================================================== */

    bindAppEvents() {

        const logout =
            document.getElementById(
                "app-logout"
            );

        if (logout) {

            logout.addEventListener(
                "click",
                () => this.logout()
            );

        }


        const switchBusiness =
            document.getElementById(
                "switch-business"
            );

        if (switchBusiness) {

            switchBusiness.addEventListener(
                "click",
                () => {

                    localStorage.removeItem(
                        "kra_current_business"
                    );

                    window.location.href =
                        "/business.html";

                }
            );

        }


        /*
         * Application navigation
         */

        document
            .querySelectorAll(
                ".nav-item[data-page]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.showPage(
                            button.dataset.page,
                            true
                        );

                    }
                );

            });


        /*
         * Dashboard
         */

        const globalSearch =
            document.getElementById("global-search");

        if (globalSearch) {

            globalSearch.addEventListener("input", () => {

                const dashboardSearch =
                    document.getElementById(
                        "recent-purchases-search"
                    );

                if (dashboardSearch) {
                    dashboardSearch.value = globalSearch.value;
                    dashboardSearch.dispatchEvent(
                        new Event("input")
                    );
                }

            });

        }


        const refresh =
            document.getElementById(
                "refresh-dashboard-btn"
            );

        if (refresh) {

            refresh.addEventListener(
                "click",
                async () => {

                    refresh.disabled = true;

                    const icon = refresh.querySelector("i");
                    if (icon) icon.classList.add("ph-spin");

                    await Dashboard.load();

                    if (window.Toast) {
                        Toast.success("Dashboard refreshed");
                    }

                    refresh.disabled = false;
                    if (icon) icon.classList.remove("ph-spin");

                }
            );

        }


        const topbarRefresh =
            document.getElementById(
                "topbar-refresh-btn"
            );

        if (topbarRefresh) {

            topbarRefresh.addEventListener(
                "click",
                () => {
                    if (refresh) {
                        refresh.click();
                    } else {
                        Dashboard.load();
                    }
                }
            );

        }


        const notificationsBtn =
            document.getElementById(
                "notifications-btn"
            );

        if (notificationsBtn) {

            notificationsBtn.addEventListener(
                "click",
                () => {
                    if (window.Toast) {
                        Toast.info("No new notifications");
                    }
                }
            );

        }


        /*
         * Purchases
         */

        const syncPurchases =
            document.getElementById(
                "sync-purchases-btn"
            );

        if (syncPurchases) {

            syncPurchases.addEventListener(
                "click",
                () => Purchases.sync()
            );

        }


        const syncItemsBtn =
            document.getElementById(
                "sync-items-btn"
            );

        if (syncItemsBtn) {

            syncItemsBtn.addEventListener(
                "click",
                async () => {

                    const status =
                        document.getElementById(
                            "item-status"
                        );

                    syncItemsBtn.disabled = true;

                    if (status) {
                        status.classList.remove("hidden");
                        status.textContent =
                            "Connecting to KRA eTIMS...";
                    }

                    try {

                        const result = await Items.sync();

                        if (status) {
                            status.textContent =
                                `Synchronization complete. ${result.count} item(s) received.`;
                        }

                        await Items.render();

                    } catch (error) {

                        if (status) {
                            status.textContent =
                                `Sync failed: ${error.message}`;
                        }

                    } finally {

                        syncItemsBtn.disabled = false;

                    }

                }
            );

        }


        const syncBranchesBtn =
            document.getElementById(
                "sync-branches-btn"
            );

        if (syncBranchesBtn) {

            syncBranchesBtn.addEventListener(
                "click",
                async () => {

                    const status =
                        document.getElementById(
                            "branch-status"
                        );

                    syncBranchesBtn.disabled = true;

                    if (status) {
                        status.classList.remove("hidden");
                        status.textContent =
                            "Connecting to KRA eTIMS...";
                    }

                    try {

                        const response = await fetch(
                            "/api/branches/sync",
                            {
                                method: "POST",
                                headers: Auth.headers(),
                                body: JSON.stringify({
                                    businessId:
                                        this.currentBusiness.id
                                })
                            }
                        );

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                            throw new Error(
                                data.message ||
                                "Branch synchronization failed"
                            );
                        }

                        if (status) {
                            status.textContent =
                                `Synchronization complete. ${data.count} branch(es) received.`;
                        }

                        await this.loadBranches();

                    } catch (error) {

                        if (status) {
                            status.textContent =
                                `Sync failed: ${error.message}`;
                        }

                    } finally {

                        syncBranchesBtn.disabled = false;

                    }

                }
            );

        }


        /*
         * Transactions
         */

        const rematchBtn =
            document.getElementById(
                "rematch-btn"
            );

        if (rematchBtn) {

            rematchBtn.addEventListener(
                "click",
                async () => {

                    rematchBtn.disabled = true;

                    try {

                        await Transactions.rematch();
                        await Transactions.render();

                    } catch (error) {

                        console.error(error);

                    } finally {

                        rematchBtn.disabled = false;

                    }

                }
            );

        }


        /*
         * Items
         */

        const addItem =
            document.getElementById(
                "add-item-btn"
            );

        if (addItem) {

            addItem.addEventListener(
                "click",
                () => {

                    this.openModal(
                        "item-modal"
                    );

                }
            );

        }


        const itemForm =
            document.getElementById(
                "item-form"
            );

        if (itemForm) {

            itemForm.addEventListener(
                "submit",
                this.createItem.bind(this)
            );

        }


        /*
         * Modal close
         */

        document
            .querySelectorAll(
                ".close-modal"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.modal;

                        if (modalId) {

                            this.closeModal(
                                modalId
                            );

                        }

                    }
                );

            });

    },


    /* ==========================================================
       LOGIN
       ========================================================== */

    async login(event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "login-email"
            ).value;


        const password =
            document.getElementById(
                "login-password"
            ).value;


        const message =
            document.getElementById(
                "login-message"
            );


        message.textContent =
            "Signing in...";


        try {

            const data =
                await Auth.login(
                    email,
                    password
                );


            this.currentUser =
                data.user;


            message.textContent = "";


            /*
             * Authentication is complete.
             * Move to profile page.
             */

            window.location.href =
                "/profile.html";

        } catch (error) {

            message.textContent =
                error.message;

        }

    },


    /* ==========================================================
       REGISTER
       ========================================================== */

    async register(event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "register-email"
            ).value;


        const password =
            document.getElementById(
                "register-password"
            ).value;


        const message =
            document.getElementById(
                "register-message"
            );


        message.textContent =
            "Creating account...";


        try {

            await Auth.register(
                email,
                password
            );


            await Auth.login(
                email,
                password
            );


            this.currentUser =
                JSON.parse(
                    localStorage.getItem(
                        "kra_user"
                    ) || "null"
                );


            message.textContent = "";


            window.location.href =
                "/profile.html";

        } catch (error) {

            message.textContent =
                error.message;

        }

    },


    /* ==========================================================
       RESTORE PROFILE
       ========================================================== */

    async restoreProfile() {

        const profileId =
            localStorage.getItem(
                "kra_current_profile"
            );


        if (!profileId) {

            this.currentProfile = null;

            return null;

        }


        try {

            const profiles =
                await Profiles.getAll();


            this.currentProfile =
                profiles.find(
                    profile =>
                        Number(profile.id) ===
                        Number(profileId)
                ) || null;


            return this.currentProfile;

        } catch (error) {

            console.error(
                "Unable to restore profile:",
                error
            );


            this.currentProfile =
                null;


            return null;

        }

    },


    /* ==========================================================
       SHOW PROFILES
       ========================================================== */

    async showProfiles() {

        const container =
            document.getElementById(
                "profiles-list"
            );


        if (!container) {

            return;

        }


        const user =
            this.currentUser ||
            JSON.parse(
                localStorage.getItem(
                    "kra_user"
                ) || "null"
            );


        if (user) {

            const email =
                document.getElementById(
                    "profile-user-email"
                );

            if (email) {

                email.textContent =
                    user.email;

            }

        }


        container.innerHTML = `

            <div class="loading-state">

                <span class="loading-spinner"></span>

                <span>
                    Loading profiles...
                </span>

            </div>

        `;


        try {

            const profiles =
                await Profiles.getAll();


            if (!profiles.length) {

                container.innerHTML = `

                    <div class="profile-card">

                        <div class="profile-icon">
                            <i class="ph ph-user-plus"></i>
                        </div>

                        <h3>
                            No profiles yet
                        </h3>

                        <p>
                            Create your first profile
                            to continue.
                        </p>

                        <button
                            class="btn btn-primary card-action"
                            onclick="App.openModal('profile-modal')"
                        >
                            <i class="ph ph-plus"></i>
                            Create Profile
                        </button>

                    </div>

                `;

                return;

            }


            container.innerHTML =
                profiles.map(profile => `

                    <div class="profile-card">

                        <div class="profile-icon">

                            <i class="${
                                profile.profile_type === "personal"
                                    ? "ph ph-user"
                                    : "ph ph-buildings"
                            }"></i>

                        </div>

                        <h3>
                            ${profile.profile_name}
                        </h3>

                        <p>
                            ${
                                profile.profile_type
                            }
                            ·
                            ${
                                profile.business_count || 0
                            }
                            business(es)
                        </p>

                        <button
                            class="btn btn-primary card-action"
                            onclick="App.selectProfile(${profile.id})"
                        >
                            Open Profile
                            <i class="ph ph-arrow-right"></i>
                        </button>

                    </div>

                `).join("");

        } catch (error) {

            container.innerHTML = `

                <div class="state-message error-state">

                    <i class="ph ph-warning-circle"></i>

                    <strong>
                        Unable to load profiles
                    </strong>

                    <span>
                        ${error.message}
                    </span>

                </div>

            `;

        }

    },


    /* ==========================================================
       SELECT PROFILE
       ========================================================== */

    async selectProfile(profileId) {

        try {

            const profiles =
                await Profiles.getAll();


            this.currentProfile =
                profiles.find(
                    profile =>
                        Number(profile.id) ===
                        Number(profileId)
                );


            if (!this.currentProfile) {

                throw new Error(
                    "Profile not found"
                );

            }


            /*
             * Persist selected profile
             */

            localStorage.setItem(
                "kra_current_profile",
                this.currentProfile.id
            );


            /*
             * A new profile means we should
             * choose its business.
             */

            localStorage.removeItem(
                "kra_current_business"
            );


            window.location.href =
                "/business.html";

        } catch (error) {

            alert(
                error.message
            );

        }

    },


    /* ==========================================================
       SHOW BUSINESSES
       ========================================================== */

    async showBusinesses() {

        if (!this.currentProfile) {

            window.location.href =
                "/profile.html";

            return;

        }


        const label =
            document.getElementById(
                "business-profile-label"
            );


        if (label) {

            label.textContent =
                this.currentProfile.profile_name;

        }


        const container =
            document.getElementById(
                "businesses-list"
            );


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="loading-state">

                <span class="loading-spinner"></span>

                <span>
                    Loading businesses...
                </span>

            </div>

        `;


        try {

            const businesses =
                await Businesses.getAll(
                    this.currentProfile.id
                );


            if (!businesses.length) {

                container.innerHTML = `

                    <div class="business-card">

                        <div class="business-icon">
                            <i class="ph ph-buildings"></i>
                        </div>

                        <h3>
                            No businesses yet
                        </h3>

                        <p>
                            Add a business and connect
                            it to KRA.
                        </p>

                        <button
                            class="btn btn-primary card-action"
                            onclick="App.openModal('business-modal')"
                        >
                            <i class="ph ph-plus"></i>
                            Add Business
                        </button>

                    </div>

                `;

                return;

            }


            container.innerHTML =
                businesses.map(business => {

                    const env = business.environment || "test";

                    const status = business.status || "pending";

                    const statusLabel = {
                        connected: "Connected",
                        pending: "Pending",
                        error: "Connection error"
                    }[status] || "Pending";

                    return `

                    <div class="business-card">

                        <div class="business-card-top">

                            <div class="business-icon">
                                <i class="ph ph-buildings"></i>
                            </div>

                            <span class="badge badge-env-${env}">
                                ${env === "live" ? "Live" : "Test"}
                            </span>

                        </div>

                        <h3>
                            ${business.business_name}
                        </h3>

                        <p>
                            KRA PIN:
                            ${business.kra_pin || "-"}
                        </p>

                        <span class="badge badge-status-${status}">
                            <i class="ph ph-circle-fill"></i>
                            ${statusLabel}
                        </span>

                        <button
                            class="btn btn-primary card-action"
                            onclick="App.selectBusiness(${business.id})"
                        >
                            Open Business
                            <i class="ph ph-arrow-right"></i>
                        </button>

                    </div>

                    `;

                }).join("");

        } catch (error) {

            container.innerHTML = `

                <div class="state-message error-state">

                    <i class="ph ph-warning-circle"></i>

                    <strong>
                        Unable to load businesses
                    </strong>

                    <span>
                        ${error.message}
                    </span>

                </div>

            `;

        }

    },


    /* ==========================================================
       SELECT BUSINESS
       ========================================================== */

    async selectBusiness(businessId) {

        try {

            this.currentBusiness =
                await Businesses.get(
                    businessId
                );


            if (!this.currentBusiness) {

                throw new Error(
                    "Business not found"
                );

            }


            /*
             * Persist selected business
             */

            localStorage.setItem(
                "kra_current_business",
                this.currentBusiness.id
            );


            /*
             * Open main application
             */

            window.location.href =
                "/app.html";

        } catch (error) {

            alert(
                error.message
            );

        }

    },


    /* ==========================================================
       RESTORE BUSINESS
       ========================================================== */

    async restoreBusiness() {

        const businessId =
            localStorage.getItem(
                "kra_current_business"
            );


        if (!businessId) {

            this.currentBusiness =
                null;

            return null;

        }


        try {

            this.currentBusiness =
                await Businesses.get(
                    businessId
                );


            return this.currentBusiness;

        } catch (error) {

            console.error(
                "Unable to restore business:",
                error
            );


            this.currentBusiness =
                null;


            localStorage.removeItem(
                "kra_current_business"
            );


            return null;

        }

    },


    /* ==========================================================
       APP CONTEXT
       ========================================================== */

    populateAppContext() {

        if (!this.currentBusiness) {

            return;

        }


        const businessName =
            document.getElementById(
                "sidebar-business-name"
            );

        if (businessName) {

            businessName.textContent =
                this.currentBusiness.business_name;

        }


        const profileName =
            document.getElementById(
                "current-profile-name"
            );

        if (profileName) {

            profileName.textContent =
                this.currentProfile
                    ? this.currentProfile.profile_name
                    : "-";

        }


        const currentBusiness =
            document.getElementById(
                "current-business-name"
            );

        if (currentBusiness) {

            currentBusiness.textContent =
                this.currentBusiness.business_name;

        }


        const email =
            document.getElementById(
                "app-user-email"
            );

        if (
            email &&
            this.currentUser
        ) {

            email.textContent =
                this.currentUser.email;

            const avatarInitial =
                document.getElementById(
                    "sidebar-avatar-initial"
                );

            if (avatarInitial && this.currentUser.email) {

                avatarInitial.textContent =
                    this.currentUser.email
                        .charAt(0)
                        .toUpperCase();

            }

        }

    },


    /* ==========================================================
       CREATE PROFILE
       ========================================================== */

    async createProfile(event) {

        event.preventDefault();


        const name =
            document.getElementById(
                "profile-name"
            ).value;


        const type =
            document.getElementById(
                "profile-type"
            ).value;


        try {

            await Profiles.create(
                name,
                type
            );


            this.closeModal(
                "profile-modal"
            );


            const form =
                document.getElementById(
                    "profile-form"
                );

            if (form) {

                form.reset();

            }


            await this.showProfiles();

        } catch (error) {

            alert(
                error.message
            );

        }

    },


    /* ==========================================================
       CREATE BUSINESS
       ========================================================== */

    async createBusiness(event) {

        event.preventDefault();


        if (!this.currentProfile) {

            alert(
                "No profile selected."
            );

            return;

        }


        const message =
            document.getElementById(
                "business-form-message"
            );


        if (message) {

            message.textContent =
                "Creating business...";

        }


        try {

            const business =
                await Businesses.create({

                    profileId:
                        this.currentProfile.id,

                    businessName:
                        document.getElementById(
                            "business-name"
                        ).value,

                    kraPin:
                        document.getElementById(
                            "business-kra-pin"
                        ).value,

                    environment:
                        document.getElementById(
                            "business-environment"
                        ).value

                });


            this.closeModal(
                "business-modal"
            );


            const form =
                document.getElementById(
                    "business-form"
                );


            if (form) {

                form.reset();

            }


            if (message) {

                message.textContent = "";

            }


            await this.showBusinesses();

        } catch (error) {

            if (message) {

                message.textContent =
                    error.message;

            }

        }

    },


    /* ==========================================================
       CREATE ITEM
       ========================================================== */

    async createItem(event) {

        event.preventDefault();


        try {

            await Items.create({

                itemCode:
                    document.getElementById(
                        "item-code"
                    ).value,

                itemName:
                    document.getElementById(
                        "item-name"
                    ).value,

                category:
                    document.getElementById(
                        "item-category"
                    ).value,

                unit:
                    document.getElementById(
                        "item-unit"
                    ).value,

                unitPrice:
                    Number(
                        document.getElementById(
                            "item-price"
                        ).value
                    )

            });


            this.closeModal(
                "item-modal"
            );


            const form =
                document.getElementById(
                    "item-form"
                );


            if (form) {

                form.reset();

            }


            await Items.render();

        } catch (error) {

            alert(
                error.message
            );

        }

    },


    /* ==========================================================
       PAGE NAVIGATION
       ========================================================== */

    async showPage(
        page,
        pushHistory = true
    ) {

        /*
         * Only run on app.html
         */

        if (
            !document.getElementById(
                "main-app"
            )
        ) {

            return;

        }


        const validPages = [
            "dashboard",
            "items",
            "purchases",
            "payments",
            "branches",
            "transactions"
        ];


        if (
            !validPages.includes(page)
        ) {

            page = "dashboard";

        }


        /*
         * Hide all pages
         */

        document
            .querySelectorAll(
                ".app-page"
            )
            .forEach(element => {

                element.classList.add(
                    "hidden"
                );

            });


        /*
         * Remove active nav state
         */

        document
            .querySelectorAll(
                ".nav-item[data-page]"
            )
            .forEach(button => {

                button.classList.remove(
                    "active"
                );

            });


        /*
         * Show requested page
         */

        const pageElement =
            document.getElementById(
                `page-${page}`
            );


        if (pageElement) {

            pageElement.classList.remove(
                "hidden"
            );

        }


        /*
         * Activate navigation item
         */

        const nav =
            document.querySelector(
                `.nav-item[data-page="${page}"]`
            );


        if (nav) {

            nav.classList.add(
                "active"
            );

        }


        /*
         * Page titles
         */

        const titles = {

            dashboard:
                "Dashboard",

            items:
                "Items",

            purchases:
                "Purchases",

            payments:
                "Payments",

            branches:
                "Branch Information",

            transactions:
                "Transactions"

        };


        const title =
            document.getElementById(
                "page-title"
            );


        if (title) {

            title.textContent =
                titles[page] ||
                "Dashboard";

        }


        /*
         * Save current page
         */

        localStorage.setItem(
            "kra_current_page",
            page
        );


        /*
         * Update browser URL/history
         */

        const newUrl =
            `/app.html?page=${page}`;


        if (pushHistory) {

            window.history.pushState(
                {
                    page: page
                },
                "",
                newUrl
            );

        } else {

            /*
             * When restoring the page,
             * make sure URL is correct.
             */

            if (
                window.location.pathname
                    .toLowerCase()
                    .endsWith("app.html")
            ) {

                const current =
                    new URLSearchParams(
                        window.location.search
                    ).get("page");


                if (current !== page) {

                    window.history.replaceState(
                        {
                            page: page
                        },
                        "",
                        newUrl
                    );

                }

            }

        }


        /*
         * Load page data
         */

        if (
            page === "dashboard"
        ) {

            await Dashboard.load();

        }


        if (
            page === "items"
        ) {

            await Items.render();

        }


        if (
            page === "purchases"
        ) {

            console.log(
                "Ready for KRA purchase synchronization."
            );

        }


        if (
            page === "payments"
        ) {

            await Payments.render();

        }


        if (
            page === "branches"
        ) {

            await this.loadBranches();

        }


        if (
            page === "transactions"
        ) {

            await Transactions.render();

        }

    },


    /* ==========================================================
       BRANCHES
       ========================================================== */

    async loadBranches() {

        const container =
            document.getElementById(
                "branch-details"
            );


        if (!container) {

            return;

        }


        container.innerHTML = `

            <div class="loading-state">

                <span class="loading-spinner"></span>

                <span>
                    Loading branch information...
                </span>

            </div>

        `;


        try {

            const branches =
                await Businesses.branches(
                    this.currentBusiness.id
                );


            if (!branches.length) {

                container.innerHTML = `

                    <div class="state-message">

                        <i class="ph ph-buildings"></i>

                        <strong>
                            No branches found
                        </strong>

                        <span>
                            There are currently no
                            branches associated with
                            this business.
                        </span>

                    </div>

                `;

                return;

            }


            container.innerHTML =
                branches.map(branch => `

                    <div class="info-card">

                        <span>
                            Branch Name
                        </span>

                        <strong>
                            ${
                                branch.branch_name || "-"
                            }
                        </strong>

                        <span
                            style="margin-top:18px"
                        >
                            Branch ID
                        </span>

                        <strong>
                            ${
                                branch.branch_id || "-"
                            }
                        </strong>

                    </div>

                `).join("");

        } catch (error) {

            container.innerHTML = `

                <div class="state-message error-state">

                    <i class="ph ph-warning-circle"></i>

                    <strong>
                        Unable to load branches
                    </strong>

                    <span>
                        ${error.message}
                    </span>

                </div>

            `;

        }

    },


    /* ==========================================================
       LOGOUT
       ========================================================== */

    logout() {

        localStorage.removeItem(
            "kra_current_profile"
        );

        localStorage.removeItem(
            "kra_current_business"
        );

        localStorage.removeItem(
            "kra_current_page"
        );


        Auth.logout();

    },


    /* ==========================================================
       SCREEN CONTROL
       ========================================================== */

    showScreen(screenId) {

        document
            .querySelectorAll(
                ".auth-screen, .page-screen, .main-app"
            )
            .forEach(screen => {

                screen.classList.add(
                    "hidden"
                );

            });


        const screen =
            document.getElementById(
                screenId
            );


        if (screen) {

            screen.classList.remove(
                "hidden"
            );

        }

    },


    /* ==========================================================
       MODALS
       ========================================================== */

    openModal(id) {

        const modal =
            document.getElementById(
                id
            );


        if (modal) {

            modal.classList.remove(
                "hidden"
            );

        }

    },


    closeModal(id) {

        const modal =
            document.getElementById(
                id
            );


        if (modal) {

            modal.classList.add(
                "hidden"
            );

        }

    }

};


/* ============================================================
   START APPLICATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => App.init()
);