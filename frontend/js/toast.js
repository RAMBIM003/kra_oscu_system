const Toast = {

    ensureStack() {

        let stack = document.querySelector(".toast-stack");

        if (!stack) {
            stack = document.createElement("div");
            stack.className = "toast-stack";
            document.body.appendChild(stack);
        }

        return stack;

    },

    show(message, type) {

        const stack = this.ensureStack();

        const icons = {
            success: "ph-check-circle",
            error: "ph-x-circle",
            info: "ph-info"
        };

        const toast = document.createElement("div");
        toast.className = `toast toast-${type || "info"}`;

        toast.innerHTML = `
            <i class="ph ${icons[type] || icons.info} toast-icon"></i>
            <span>${message}</span>
        `;

        stack.appendChild(toast);

        setTimeout(() => {

            toast.classList.add("leaving");

            setTimeout(() => {
                toast.remove();
            }, 200);

        }, 4000);

    },

    success(message) {
        this.show(message, "success");
    },

    error(message) {
        this.show(message, "error");
    },

    info(message) {
        this.show(message, "info");
    }

};
