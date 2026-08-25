(() => {
    "use strict";

    const volumeContainer = document.getElementById("volumeBars");
    const reflectionContainer = document.getElementById("reflectionBars");
    if (!volumeContainer || !reflectionContainer) {
        return;
    }

    const barCount = 22;
    const minimumHeight = 10;
    const maximumHeight = 94;
    const minimumDepthScale = 0.5;
    const depthCurve = 1.35;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bars = [];
    const reflections = [];
    const motionProfiles = [];
    let animationFrameId = null;

    const depthScaleFor = (index) => {
        const center = (barCount - 1) / 2;
        const distanceFromCenter = Math.abs(index - center) / center;
        return minimumDepthScale
            + (1 - minimumDepthScale) * Math.pow(distanceFromCenter, depthCurve);
    };

    const createBar = (container, index) => {
        const holder = document.createElement("div");
        const bar = document.createElement("div");
        const depthScale = depthScaleFor(index);
        holder.className = "bar-container";
        holder.style.setProperty("--depth-height", `${(depthScale * 100).toFixed(2)}%`);
        holder.style.setProperty("--depth-width", `${(depthScale * 5.15).toFixed(4)}%`);
        holder.style.setProperty("--depth-margin", `${(depthScale * 0.5).toFixed(4)}%`);
        holder.style.setProperty("--depth-opacity", (0.68 + depthScale * 0.32).toFixed(4));
        holder.style.setProperty("--depth-brightness", (0.76 + depthScale * 0.24).toFixed(4));
        holder.style.setProperty("--depth-saturation", (0.82 + depthScale * 0.18).toFixed(4));
        bar.className = "bar";
        holder.appendChild(bar);
        container.appendChild(holder);
        return bar;
    };

    for (let index = 0; index < barCount; index += 1) {
        bars.push(createBar(volumeContainer, index));
        reflections.push(createBar(reflectionContainer, index));
        motionProfiles.push({
            phase: Math.random() * Math.PI * 2,
            detailPhase: Math.random() * Math.PI * 2,
            speed: 2 + Math.random() * 1.15
        });
    }

    const setHeight = (index, height) => {
        const value = `${height.toFixed(2)}%`;
        bars[index].style.height = value;
        reflections[index].style.height = value;
    };

    const setStaticHeights = () => {
        bars.forEach((_, index) => {
            const wave = 32 + Math.abs(Math.sin(index * 0.72)) * 38;
            setHeight(index, wave);
        });
    };

    const stop = () => {
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    const renderFrame = (timestamp) => {
        const time = timestamp / 1000;
        motionProfiles.forEach((profile, index) => {
            const primary = (Math.sin(time * profile.speed + profile.phase) + 1) / 2;
            const detail = (Math.sin(time * profile.speed * 1.73 + profile.detailPhase) + 1) / 2;
            const travelingWave = (Math.sin(time * 1.38 - index * 0.58) + 1) / 2;
            const level = primary * 0.54 + detail * 0.27 + travelingWave * 0.19;
            const height = minimumHeight + level * (maximumHeight - minimumHeight);
            setHeight(index, height);
        });

        animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    const syncMotion = () => {
        stop();
        if (reducedMotion.matches) {
            setStaticHeights();
            return;
        }

        if (!document.hidden) {
            animationFrameId = window.requestAnimationFrame(renderFrame);
        }
    };

    setStaticHeights();
    document.addEventListener("visibilitychange", syncMotion);
    reducedMotion.addEventListener?.("change", syncMotion);
    syncMotion();
})();
