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
    const maximumDepthLift = 34;
    // Show the central segment of a larger circle so the projected arc stays rounded without sharp ends.
    const arcRadiusFactor = 1.35;
    const arcEdgeOffset = Math.sqrt(Math.pow(arcRadiusFactor, 2) - 1);
    const arcCenterOffset = arcRadiusFactor - arcEdgeOffset;
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

    const arcRecessionForDistance = (distanceFromCenter) => (
        Math.sqrt(Math.max(0, Math.pow(arcRadiusFactor, 2) - Math.pow(distanceFromCenter, 2)))
        - arcEdgeOffset
    ) / arcCenterOffset;

    const buildPerspectiveHorizon = () => {
        if (!perspectiveHorizonPath) {
            return;
        }

        const horizon = perspectiveHorizonPath.closest("svg");
        const holders = [...volumeContainer.querySelectorAll(".bar-container")];
        const reflectionHolders = [...reflectionContainer.querySelectorAll(".bar-container")];
        if (!horizon || holders.length === 0 || reflectionHolders.length !== holders.length) {
            return;
        }

        const horizonRect = horizon.getBoundingClientRect();
        const volumeRect = volumeContainer.getBoundingClientRect();
        if (horizonRect.width === 0 || horizonRect.height === 0 || volumeRect.height === 0) {
            return;
        }

        const firstRect = holders[0].getBoundingClientRect();
        const lastRect = holders[holders.length - 1].getBoundingClientRect();
        const arcStart = firstRect.left - firstRect.width / 2;
        const arcEnd = lastRect.right + lastRect.width / 2;
        const arcWidth = arcEnd - arcStart;
        const arcCenter = (arcStart + arcEnd) / 2;
        const arcRadius = arcWidth / 2;
        const baseline = volumeRect.bottom;
        const arcDepth = horizonRect.height;

        const yAt = (x) => {
            const distance = Math.min(1, Math.abs(x - arcCenter) / arcRadius);
            return baseline - arcRecessionForDistance(distance) * arcDepth;
        };

        holders.forEach((holder, index) => {
            const rect = holder.getBoundingClientRect();
            const leftY = yAt(rect.left);
            const rightY = yAt(rect.right);
            const lowerY = Math.max(leftY, rightY);
            const upperY = Math.min(leftY, rightY);
            const depthLift = ((baseline - lowerY) / volumeRect.height) * 100;
            const depthRise = ((upperY - baseline) / volumeRect.height) * 100;
            const mainBar = holder.querySelector(".bar");
            const reflectionBar = reflectionHolders[index].querySelector(".bar");

            holder.style.setProperty("--depth-lift", `${depthLift.toFixed(3)}%`);
            reflectionHolders[index].style.setProperty("--depth-rise", `${depthRise.toFixed(3)}%`);

            mainBar.style.setProperty("--bar-left-inset", `${(lowerY - leftY).toFixed(3)}px`);
            mainBar.style.setProperty("--bar-right-inset", `${(lowerY - rightY).toFixed(3)}px`);
            reflectionBar.style.setProperty("--reflection-left-inset", `${(leftY - upperY).toFixed(3)}px`);
            reflectionBar.style.setProperty("--reflection-right-inset", `${(rightY - upperY).toFixed(3)}px`);
        });

        const startX = ((arcStart - horizonRect.left) / horizonRect.width) * 1000;
        const endX = ((arcEnd - horizonRect.left) / horizonRect.width) * 1000;
        const baselineY = ((baseline - horizonRect.top) / horizonRect.height) * 100;
        const radiusX = ((endX - startX) / 2) * arcRadiusFactor;
        const radiusY = (arcDepth / horizonRect.height)
            * 100
            * arcRadiusFactor
            / arcCenterOffset;
        perspectiveHorizonPath.setAttribute(
            "d",
            `M ${startX.toFixed(2)} ${baselineY.toFixed(2)}`
            + ` A ${radiusX.toFixed(2)} ${radiusY.toFixed(2)} 0 0 1`
            + ` ${endX.toFixed(2)} ${baselineY.toFixed(2)}`
        );
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
        const center = (barCount - 1) / 2;
        const distanceFromCenter = Math.abs(index - center) / center;
        const depthLift = arcRecessionForDistance(distanceFromCenter) * maximumDepthLift;
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
