(() => {
    "use strict";

    const volumeContainer = document.getElementById("volumeBars");
    const reflectionContainer = document.getElementById("reflectionBars");
    const perspectiveHorizonPath = document.getElementById("perspectiveHorizonPath");
    if (!volumeContainer || !reflectionContainer) {
        return;
    }

    const barCount = 22;
    const minimumHeight = 10;
    const maximumHeight = 94;
    const minimumDepthScale = 0.5;
    const depthCurve = 1.35;
    const maximumDepthLift = 26;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bars = [];
    const reflections = [];
    const motionProfiles = [];
    let animationFrameId = null;
    let horizonFrameId = null;

    const depthScaleForDistance = (distanceFromCenter) => minimumDepthScale
        + (1 - minimumDepthScale) * Math.pow(distanceFromCenter, depthCurve);

    const depthScaleFor = (index) => {
        const center = (barCount - 1) / 2;
        const distanceFromCenter = Math.abs(index - center) / center;
        return depthScaleForDistance(distanceFromCenter);
    };

    const recessionFor = (depthScale) => (1 - depthScale) / (1 - minimumDepthScale);

    const buildPerspectiveHorizon = () => {
        if (!perspectiveHorizonPath) {
            return;
        }

        const horizon = perspectiveHorizonPath.closest("svg");
        const holders = [...volumeContainer.querySelectorAll(".bar-container")];
        if (!horizon || holders.length === 0) {
            return;
        }

        const horizonRect = horizon.getBoundingClientRect();
        if (horizonRect.width === 0 || horizonRect.height === 0) {
            return;
        }

        const points = [{x: 0, y: 100}];
        holders.forEach((holder) => {
            const rect = holder.getBoundingClientRect();
            points.push({
                x: ((rect.left + rect.width / 2 - horizonRect.left) / horizonRect.width) * 1000,
                y: ((rect.bottom - horizonRect.top) / horizonRect.height) * 100
            });
        });
        points.push({x: 1000, y: 100});

        const path = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
        for (let index = 0; index < points.length - 1; index += 1) {
            const previous = points[index - 1] ?? points[index];
            const current = points[index];
            const next = points[index + 1];
            const following = points[index + 2] ?? next;
            const controlOne = {
                x: current.x + (next.x - previous.x) / 8,
                y: current.y + (next.y - previous.y) / 8
            };
            const controlTwo = {
                x: next.x - (following.x - current.x) / 8,
                y: next.y - (following.y - current.y) / 8
            };
            path.push(
                `C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)}`
                + ` ${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)}`
                + ` ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
            );
        }
        perspectiveHorizonPath.setAttribute("d", path.join(" "));
    };

    const schedulePerspectiveHorizon = () => {
        if (horizonFrameId !== null) {
            window.cancelAnimationFrame(horizonFrameId);
        }
        horizonFrameId = window.requestAnimationFrame(() => {
            horizonFrameId = null;
            buildPerspectiveHorizon();
        });
    };

    const createBar = (container, index) => {
        const holder = document.createElement("div");
        const bar = document.createElement("div");
        const depthScale = depthScaleFor(index);
        const depthLift = recessionFor(depthScale) * maximumDepthLift;
        holder.className = "bar-container";
        holder.style.setProperty("--depth-height", `${(depthScale * 100).toFixed(2)}%`);
        holder.style.setProperty("--depth-width", `${(depthScale * 5.15).toFixed(4)}%`);
        holder.style.setProperty("--depth-margin", `${(depthScale * 0.5).toFixed(4)}%`);
        holder.style.setProperty("--depth-lift", `${depthLift.toFixed(2)}%`);
        holder.style.setProperty("--depth-rise", `${(-depthLift).toFixed(2)}%`);
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

    schedulePerspectiveHorizon();

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
    window.addEventListener("resize", schedulePerspectiveHorizon, {passive: true});
    syncMotion();
})();
