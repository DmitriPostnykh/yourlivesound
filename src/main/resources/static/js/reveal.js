(() => {
    "use strict";

    const targets = Array.from(document.querySelectorAll(".fade-in, .service"));
    if (targets.length === 0) {
        return;
    }

    document.documentElement.classList.add("reveal-ready");

    const showAll = () => targets.forEach((target) => target.classList.add("is-visible"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        showAll();
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: "0px 0px -8%",
        threshold: 0.12
    });

    targets.forEach((target) => observer.observe(target));
})();
