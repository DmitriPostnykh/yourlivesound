(() => {
    "use strict";

    const volumeContainer = document.getElementById("volumeBars");
    const reflectionContainer = document.getElementById("reflectionBars");
    if (!volumeContainer || !reflectionContainer) {
        return;
    }

    const barCount = 16;
    const minimumHeight = 8;
    const maximumHeight = 94;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bars = [];
    const reflections = [];
    let timerId = null;

    const createBar = (container) => {
        const holder = document.createElement("div");
        const bar = document.createElement("div");
        holder.className = "bar-container";
        bar.className = "bar";
        holder.appendChild(bar);
        container.appendChild(holder);
        return bar;
    };

    for (let index = 0; index < barCount; index += 1) {
        bars.push(createBar(volumeContainer));
        reflections.push(createBar(reflectionContainer));
    }

    const setHeights = (animated) => {
        bars.forEach((bar, index) => {
            const wave = 32 + Math.abs(Math.sin(index * 0.72)) * 38;
            const height = animated
                ? minimumHeight + Math.random() * (maximumHeight - minimumHeight)
                : wave;
            const value = `${height.toFixed(1)}%`;
            bar.style.height = value;
            reflections[index].style.height = value;
        });
    };

    const stop = () => {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    };

    const start = () => {
        stop();
        if (document.hidden || reducedMotion.matches) {
            setHeights(false);
            return;
        }
        setHeights(true);
        timerId = window.setInterval(() => setHeights(true), 90);
    };

    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener?.("change", start);
    start();
})();
