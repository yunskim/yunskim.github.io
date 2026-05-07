(() => {
    function buttonText(button, text) {
        button.textContent = text;
        button.setAttribute("aria-label", text);
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
    }

    function addCopyButtons() {
        document.querySelectorAll("pre > code").forEach((code) => {
            const pre = code.parentElement;
            if (!pre || pre.dataset.copyButton === "true") return;

            pre.dataset.copyButton = "true";
            const button = document.createElement("button");
            button.type = "button";
            button.className = "copy-code-button sans";
            buttonText(button, "Copy");

            button.addEventListener("click", async () => {
                try {
                    await copyText(code.innerText);
                    buttonText(button, "Copied");
                } catch {
                    buttonText(button, "Failed");
                }

                window.setTimeout(() => buttonText(button, "Copy"), 1200);
            });

            pre.before(button);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addCopyButtons);
    } else {
        addCopyButtons();
    }
})();
