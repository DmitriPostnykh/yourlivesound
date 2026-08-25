(() => {
    "use strict";

    const volumeContainer = document.getElementById("volumeBars");
    const reflectionContainer = document.getElementById("reflectionBars");
    const perspectiveHorizonPath = document.getElementById("perspectiveHorizonPath");
    const perspectiveCeilingPath = document.getElementById("perspectiveCeilingPath");
    if (
        !volumeContainer
        || !reflectionContainer
        || !perspectiveHorizonPath
        || !perspectiveCeilingPath
    ) {
        return;
    }

    const barCount = 22;
    const minimumHeight = 14;
    const maximumHeight = 100;
    const neutralTopHeight = 50;
    const titleFloorGap = 5;
    const pulseSpeed = 6.2;
    const attackResponse = 20;
    const releaseResponse = 3.2;
    const minimumDepthScale = 0.5;
    const depthCurve = 1.35;
    const maximumDepthLift = 34;
    // Show the central segment of a larger circle so the projected arc stays rounded without sharp ends.
    const arcRadiusFactor = 1.35;
    const arcEdgeOffset = Math.sqrt(Math.pow(arcRadiusFactor, 2) - 1);
    const arcCenterOffset = arcRadiusFactor - arcEdgeOffset;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const equalizerMode = new URLSearchParams(window.location.search).get("equalizer");
    const requestedFixedHeight = Number.parseFloat(equalizerMode);
    const fixedEnvelopeHeight = equalizerMode === "max"
        ? maximumHeight
        : Number.isFinite(requestedFixedHeight)
            ? Math.min(maximumHeight, Math.max(minimumHeight, requestedFixedHeight))
            : null;
    const bars = [];
    const reflections = [];
    const motionProfiles = [];
    const maximumTopSlopes = [];
    const currentHeights = Array(barCount).fill(minimumHeight);
    let animationFrameId = null;
    let envelopeFrameId = null;
    let previousFrameTimestamp = null;

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

    const applyDynamicTopSlope = (index, height) => {
        const maximumSlope = maximumTopSlopes[index];
        const bar = bars[index];
        if (!bar || !Number.isFinite(maximumSlope)) {
            return;
        }

        // Cross-sections are flat halfway between the two arcs. Above that line the
        // top follows the ceiling arc; below it the same slope reverses toward the floor arc.
        const slopeProgress = (height - neutralTopHeight) / (maximumHeight - neutralTopHeight);
        const currentSlope = maximumSlope * slopeProgress;
        bar.style.setProperty("--bar-top-left-inset", `${Math.max(0, -currentSlope).toFixed(3)}px`);
        bar.style.setProperty("--bar-top-right-inset", `${Math.max(0, currentSlope).toFixed(3)}px`);
    };

    const syncTitleFloorGap = () => {
        const equalizer = volumeContainer.closest(".equalizer");
        const title = equalizer?.querySelector(".title");
        if (!equalizer || !title) {
            return;
        }

        const style = window.getComputedStyle(title);
        const lineHeight = Number.parseFloat(style.lineHeight);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context || !Number.isFinite(lineHeight)) {
            return;
        }

        context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const text = title.textContent.replace(/\s+/g, " ").trim();
        const metrics = context.measureText(text);
        const fontAscent = metrics.fontBoundingBoxAscent;
        const fontDescent = metrics.fontBoundingBoxDescent;
        const inkDescent = metrics.actualBoundingBoxDescent;
        if (![fontAscent, fontDescent, inkDescent].every(Number.isFinite)) {
            return;
        }

        const baselineFromBottom = fontDescent
            + (lineHeight - fontAscent - fontDescent) / 2;
        const visibleInkGap = baselineFromBottom - inkDescent;
        const correction = Math.max(0, visibleInkGap - titleFloorGap);
        equalizer.style.setProperty("--title-floor-correction", `${correction.toFixed(3)}px`);
    };

    const buildPerspectiveEnvelope = () => {
        const horizon = perspectiveHorizonPath.closest("svg");
        const ceiling = perspectiveCeilingPath.closest("svg");
        const equalizer = volumeContainer.closest(".equalizer");
        const holders = [...volumeContainer.querySelectorAll(".bar-container")];
        const reflectionHolders = [...reflectionContainer.querySelectorAll(".bar-container")];
        if (
            !horizon
            || !ceiling
            || !equalizer
            || holders.length === 0
            || reflectionHolders.length !== holders.length
        ) {
            return;
        }

        const horizonRect = horizon.getBoundingClientRect();
        const volumeRect = volumeContainer.getBoundingClientRect();
        const equalizerRect = equalizer.getBoundingClientRect();
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
        const upperBaseline = baseline - volumeRect.height;
        const arcDepth = horizonRect.height;
        ceiling.style.top = `${(upperBaseline - equalizerRect.top).toFixed(3)}px`;
        const ceilingRect = ceiling.getBoundingClientRect();

        const recessionAt = (x) => {
            const distance = Math.min(1, Math.abs(x - arcCenter) / arcRadius);
            return arcRecessionForDistance(distance) * arcDepth;
        };

        holders.forEach((holder, index) => {
            const rect = holder.getBoundingClientRect();
            const bottomLeftY = baseline - recessionAt(rect.left);
            const bottomRightY = baseline - recessionAt(rect.right);
            const topLeftY = upperBaseline + recessionAt(rect.left);
            const topRightY = upperBaseline + recessionAt(rect.right);
            const boundingBottom = Math.max(bottomLeftY, bottomRightY);
            const boundingTop = Math.min(topLeftY, topRightY);
            const reflectionTop = Math.min(bottomLeftY, bottomRightY);
            const holderHeight = boundingBottom - boundingTop;
            const depthLift = ((baseline - boundingBottom) / volumeRect.height) * 100;
            const depthRise = ((reflectionTop - baseline) / volumeRect.height) * 100;
            const mainBar = holder.querySelector(".bar");
            const reflectionBar = reflectionHolders[index].querySelector(".bar");

            holder.style.setProperty("--depth-height", `${holderHeight.toFixed(3)}px`);
            reflectionHolders[index].style.setProperty("--depth-height", `${holderHeight.toFixed(3)}px`);
            holder.style.setProperty("--depth-lift", `${depthLift.toFixed(3)}%`);
            reflectionHolders[index].style.setProperty("--depth-rise", `${depthRise.toFixed(3)}%`);

            maximumTopSlopes[index] = topRightY - topLeftY;
            applyDynamicTopSlope(index, currentHeights[index]);
            mainBar.style.setProperty("--bar-left-inset", `${(boundingBottom - bottomLeftY).toFixed(3)}px`);
            mainBar.style.setProperty("--bar-right-inset", `${(boundingBottom - bottomRightY).toFixed(3)}px`);
            reflectionBar.style.setProperty("--reflection-left-inset", `${(bottomLeftY - reflectionTop).toFixed(3)}px`);
            reflectionBar.style.setProperty("--reflection-right-inset", `${(bottomRightY - reflectionTop).toFixed(3)}px`);
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

        const ceilingStartX = ((arcStart - ceilingRect.left) / ceilingRect.width) * 1000;
        const ceilingEndX = ((arcEnd - ceilingRect.left) / ceilingRect.width) * 1000;
        const ceilingRadiusX = ((ceilingEndX - ceilingStartX) / 2) * arcRadiusFactor;
        perspectiveCeilingPath.setAttribute(
            "d",
            `M ${ceilingStartX.toFixed(2)} 0`
            + ` A ${ceilingRadiusX.toFixed(2)} ${radiusY.toFixed(2)} 0 0 0`
            + ` ${ceilingEndX.toFixed(2)} 0`
        );
    };

    const schedulePerspectiveEnvelope = () => {
        if (envelopeFrameId !== null) {
            window.cancelAnimationFrame(envelopeFrameId);
        }
        envelopeFrameId = window.requestAnimationFrame(() => {
            envelopeFrameId = null;
            syncTitleFloorGap();
            buildPerspectiveEnvelope();
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
        const center = (barCount - 1) / 2;
        const distanceFromCenter = Math.abs(index - center) / center;
        bars.push(createBar(volumeContainer, index));
        reflections.push(createBar(reflectionContainer, index));
        motionProfiles.push({
            phase: Math.random() * Math.PI * 2,
            detailPhase: Math.random() * Math.PI * 2,
            speed: 3.2 + Math.random() * 1.6,
            pulsePhase: -distanceFromCenter * 0.7,
            level: 0.5
        });
    }

    schedulePerspectiveEnvelope();

    const setHeight = (index, height) => {
        const value = `${height.toFixed(2)}%`;
        currentHeights[index] = height;
        bars[index].style.height = value;
        reflections[index].style.height = value;
        applyDynamicTopSlope(index, height);
    };

    const setStaticHeights = () => {
        bars.forEach((_, index) => {
            const wave = 32 + Math.abs(Math.sin(index * 0.72)) * 38;
            motionProfiles[index].level = (wave - minimumHeight) / (maximumHeight - minimumHeight);
            setHeight(index, wave);
        });
    };

    const setFixedHeights = () => {
        bars.forEach((_, index) => setHeight(index, fixedEnvelopeHeight));
    };

    const stop = () => {
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        previousFrameTimestamp = null;
    };

    const renderFrame = (timestamp) => {
        const time = timestamp / 1000;
        const deltaSeconds = previousFrameTimestamp === null
            ? 1 / 60
            : Math.min(0.05, Math.max(0, (timestamp - previousFrameTimestamp) / 1000));
        previousFrameTimestamp = timestamp;

        motionProfiles.forEach((profile, index) => {
            const primary = (Math.sin(time * profile.speed + profile.phase) + 1) / 2;
            const detail = (Math.sin(time * profile.speed * 1.83 + profile.detailPhase) + 1) / 2;
            const travelingWave = (Math.sin(time * 2.1 - index * 0.55) + 1) / 2;
            const pulseWave = (Math.sin(time * pulseSpeed + profile.pulsePhase) + 1) / 2;
            const pulse = Math.pow(pulseWave, 9);
            const mixedLevel = primary * 0.25
                + detail * 0.15
                + travelingWave * 0.15
                + pulse * 0.45;
            // Expand the musical envelope: quieter gaps sit lower while strong beats
            // can reach the ceiling arc without keeping every bar pinned there.
            const targetLevel = Math.min(1, Math.max(0, (mixedLevel - 0.16) * 1.85));

            // A fast attack makes each beat jump upward; a slower release lets it fall naturally.
            const response = targetLevel > profile.level ? attackResponse : releaseResponse;
            const blend = 1 - Math.exp(-response * deltaSeconds);
            profile.level += (targetLevel - profile.level) * blend;

            const height = minimumHeight + profile.level * (maximumHeight - minimumHeight);
            setHeight(index, height);
        });

        animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    const syncMotion = () => {
        stop();
        if (fixedEnvelopeHeight !== null) {
            setFixedHeights();
            return;
        }

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
    window.addEventListener("resize", schedulePerspectiveEnvelope, {passive: true});
    document.fonts?.ready.then(schedulePerspectiveEnvelope);
    syncMotion();
})();
