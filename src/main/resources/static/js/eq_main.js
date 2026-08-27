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
    const introRestPixels = 2;
    const introPulseDuration = 520;
    const introWavePeakHeight = maximumHeight * 0.3;
    const introWaveBarStagger = 65;
    const introWaveRiseDuration = 130;
    const introWaveFallDuration = introWaveRiseDuration * 4;
    const introWaveBarDuration = introWaveRiseDuration + introWaveFallDuration;
    const introWaveDuration = (barCount - 1) * introWaveBarStagger + introWaveBarDuration;
    // Show the central segment of a larger circle so the projected arc stays rounded without sharp ends.
    const arcRadiusFactor = 1.35;
    const arcEdgeOffset = Math.sqrt(Math.pow(arcRadiusFactor, 2) - 1);
    const arcCenterOffset = arcRadiusFactor - arcEdgeOffset;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stageIntro = window.yourLiveSoundStageIntro;
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
    let introPulseFrameId = null;
    let introPulseElapsed = 0;
    let introPulsePreviousTimestamp = null;
    let introPulseStrength = 0;
    let introWaveFrameId = null;
    let introWaveElapsed = 0;
    let introWavePreviousTimestamp = null;
    let introWaveRestHeights = [];
    let introMode = Boolean(stageIntro?.shouldPlay);
    let introAtRest = true;
    let liveImpulseStartedAt = null;
    let liveImpulseStrength = 0;

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
        const scale = Math.max(0.001, height / maximumHeight);
        // The bar now keeps its full layout height and scales visually. Compensate
        // before the transform so the projected top edge keeps its previous slope.
        const currentSlope = maximumSlope * slopeProgress / scale;
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
            holder.style.setProperty("--depth-height", `${holderHeight.toFixed(3)}px`);
            reflectionHolders[index].style.setProperty("--depth-height", `${holderHeight.toFixed(3)}px`);
            holder.style.setProperty("--depth-lift", `${depthLift.toFixed(3)}%`);
            reflectionHolders[index].style.setProperty("--depth-rise", `${depthRise.toFixed(3)}%`);

            maximumTopSlopes[index] = topRightY - topLeftY;
            if (!introMode) {
                applyDynamicTopSlope(index, currentHeights[index]);
            }
            holder.style.setProperty("--bar-left-inset", `${(boundingBottom - bottomLeftY).toFixed(3)}px`);
            holder.style.setProperty("--bar-right-inset", `${(boundingBottom - bottomRightY).toFixed(3)}px`);
            reflectionHolders[index].style.setProperty("--reflection-left-inset", `${(bottomLeftY - reflectionTop).toFixed(3)}px`);
            reflectionHolders[index].style.setProperty("--reflection-right-inset", `${(bottomRightY - reflectionTop).toFixed(3)}px`);
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
            if (introMode && introAtRest) {
                setIntroRestHeights();
            }
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

    const barHolders = bars.map((bar) => bar.parentElement);
    const reflectionHolders = reflections.map((bar) => bar.parentElement);

    schedulePerspectiveEnvelope();

    const setBarScale = (index, height) => {
        const scale = height / maximumHeight;
        const value = `translateZ(0) scaleY(${scale.toFixed(4)})`;
        currentHeights[index] = height;
        bars[index].style.transform = value;
        reflections[index].style.transform = value;
        applyDynamicTopSlope(index, height);
    };

    const setIntroBarScale = (index, height) => {
        const scale = height / maximumHeight;
        const value = `translateZ(0) scaleY(${scale.toFixed(4)})`;
        currentHeights[index] = height;
        bars[index].style.transform = value;
        reflections[index].style.transform = value;
        bars[index].style.setProperty("--bar-top-left-inset", "0px");
        bars[index].style.setProperty("--bar-top-right-inset", "0px");
    };

    const setIntroRestScale = (index) => {
        const holderHeight = barHolders[index]?.getBoundingClientRect().height ?? 0;
        const scale = holderHeight > 0
            ? Math.min(1, introRestPixels / holderHeight)
            : introRestPixels / maximumHeight;
        const value = `translateZ(0) scaleY(${scale.toFixed(4)})`;
        currentHeights[index] = scale * maximumHeight;
        bars[index].style.transform = value;
        reflections[index].style.transform = value;
        bars[index].style.setProperty("--bar-top-left-inset", "0px");
        bars[index].style.setProperty("--bar-top-right-inset", "0px");
    };

    const setIntroRestHeights = () => {
        bars.forEach((_, index) => setIntroRestScale(index));
    };

    const setStaticHeights = () => {
        bars.forEach((_, index) => {
            const wave = 32 + Math.abs(Math.sin(index * 0.72)) * 38;
            motionProfiles[index].level = (wave - minimumHeight) / (maximumHeight - minimumHeight);
            setBarScale(index, wave);
        });
    };

    const setFixedHeights = () => {
        bars.forEach((_, index) => setBarScale(index, fixedEnvelopeHeight));
    };

    const stop = () => {
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        previousFrameTimestamp = null;
    };

    const cancelIntroPulse = () => {
        if (introPulseFrameId !== null) {
            window.cancelAnimationFrame(introPulseFrameId);
            introPulseFrameId = null;
        }
        introPulseElapsed = 0;
        introPulsePreviousTimestamp = null;
    };

    const cancelIntroWave = () => {
        if (introWaveFrameId !== null) {
            window.cancelAnimationFrame(introWaveFrameId);
            introWaveFrameId = null;
        }
        introWaveElapsed = 0;
        introWavePreviousTimestamp = null;
        introWaveRestHeights = [];
    };

    const renderFrame = (timestamp) => {
        const time = timestamp / 1000;
        const deltaSeconds = previousFrameTimestamp === null
            ? 1 / 60
            : Math.min(0.05, Math.max(0, (timestamp - previousFrameTimestamp) / 1000));
        previousFrameTimestamp = timestamp;

        if (liveImpulseStrength > 0 && liveImpulseStartedAt === null) {
            liveImpulseStartedAt = timestamp;
        }
        const liveImpulseProgress = liveImpulseStartedAt === null
            ? 1
            : Math.min(1, Math.max(0, (timestamp - liveImpulseStartedAt) / 620));
        const liveImpulse = liveImpulseStrength * Math.pow(1 - liveImpulseProgress, 2.15);

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
            const musicalTarget = Math.min(1, Math.max(0, (mixedLevel - 0.16) * 1.85));
            const individualImpulse = liveImpulse
                * (0.76 + 0.24 * ((Math.sin(profile.phase + index * 0.31) + 1) / 2));
            const targetLevel = Math.max(musicalTarget, individualImpulse);

            // A fast attack makes each beat jump upward; a slower release lets it fall naturally.
            const response = targetLevel > profile.level ? attackResponse : releaseResponse;
            const blend = 1 - Math.exp(-response * deltaSeconds);
            profile.level += (targetLevel - profile.level) * blend;

            const height = minimumHeight + profile.level * (maximumHeight - minimumHeight);
            setBarScale(index, height);
        });

        if (liveImpulseProgress >= 1) {
            liveImpulseStartedAt = null;
            liveImpulseStrength = 0;
        }

        animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    const renderIntroPulse = (timestamp) => {
        if (!document.hidden) {
            if (introPulsePreviousTimestamp !== null) {
                introPulseElapsed += Math.max(0, timestamp - introPulsePreviousTimestamp);
            }
            introPulsePreviousTimestamp = timestamp;

            const progress = Math.min(1, introPulseElapsed / introPulseDuration);
            const lift = Math.sin(Math.PI * progress) * Math.pow(1 - progress, 0.58);
            motionProfiles.forEach((profile, index) => {
                const individualAmplitude = 0.72
                    + 0.28 * ((Math.sin(profile.phase + index * 0.37) + 1) / 2);
                const height = introRestPixels
                    + (maximumHeight - introRestPixels)
                    * introPulseStrength
                    * individualAmplitude
                    * lift;
                setIntroBarScale(index, height);
            });

            if (progress >= 1) {
                introAtRest = true;
                barHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
                reflectionHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
                setIntroRestHeights();
                introPulseFrameId = null;
                return;
            }
        } else {
            introPulsePreviousTimestamp = null;
        }

        introPulseFrameId = window.requestAnimationFrame(renderIntroPulse);
    };

    const renderIntroWave = (timestamp) => {
        if (!document.hidden) {
            if (introWavePreviousTimestamp !== null) {
                introWaveElapsed += Math.max(0, timestamp - introWavePreviousTimestamp);
            }
            introWavePreviousTimestamp = timestamp;

            bars.forEach((_, index) => {
                const localElapsed = introWaveElapsed - index * introWaveBarStagger;
                if (localElapsed < 0) {
                    return;
                }

                const lift = localElapsed <= introWaveRiseDuration
                    ? Math.sin(
                        (Math.PI / 2) * Math.min(1, localElapsed / introWaveRiseDuration)
                    )
                    : Math.cos(
                        (Math.PI / 2) * Math.min(
                            1,
                            (localElapsed - introWaveRiseDuration) / introWaveFallDuration
                        )
                    );
                const restHeight = introWaveRestHeights[index] ?? currentHeights[index];
                const height = restHeight + (introWavePeakHeight - restHeight) * lift;
                setIntroBarScale(index, height);
            });

            if (introWaveElapsed >= introWaveDuration) {
                introAtRest = true;
                volumeContainer.dataset.equalizerPhase = "intro-wave-complete";
                barHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
                reflectionHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
                setIntroRestHeights();
                introWaveFrameId = null;
                return;
            }
        } else {
            introWavePreviousTimestamp = null;
        }

        introWaveFrameId = window.requestAnimationFrame(renderIntroWave);
    };

    const revealAllBars = () => {
        barHolders.forEach((holder) => holder.style.removeProperty("--bar-visible-opacity"));
        reflectionHolders.forEach((holder) => holder.style.removeProperty("--bar-visible-opacity"));
    };

    const prepareIntro = () => {
        introMode = true;
        stop();
        cancelIntroPulse();
        cancelIntroWave();
        introAtRest = true;
        volumeContainer.dataset.equalizerPhase = "intro-rest";
        barHolders.forEach((holder) => holder.style.setProperty("--bar-visible-opacity", "0"));
        reflectionHolders.forEach((holder) => holder.style.setProperty("--bar-visible-opacity", "0"));
        barHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
        reflectionHolders.forEach((holder) => holder.classList.add("is-intro-rest"));
        setIntroRestHeights();
    };

    const revealBar = (index) => {
        barHolders[index]?.style.removeProperty("--bar-visible-opacity");
        reflectionHolders[index]?.style.removeProperty("--bar-visible-opacity");
    };

    const pulse = (strength) => {
        cancelIntroPulse();
        cancelIntroWave();
        introAtRest = false;
        barHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        reflectionHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        introPulseStrength = Math.min(1, Math.max(0, strength));
        introPulseFrameId = window.requestAnimationFrame(renderIntroPulse);
    };

    const startIntroWave = () => {
        if (!introMode || introWaveFrameId !== null) {
            return;
        }

        cancelIntroPulse();
        introAtRest = false;
        volumeContainer.dataset.equalizerPhase = "intro-wave";
        barHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        reflectionHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        introWaveElapsed = 0;
        introWavePreviousTimestamp = null;
        introWaveRestHeights = currentHeights.slice();
        introWaveFrameId = window.requestAnimationFrame(renderIntroWave);
    };

    const startLive = (initialImpulse = 0) => {
        cancelIntroPulse();
        cancelIntroWave();
        introMode = false;
        introAtRest = false;
        volumeContainer.dataset.equalizerPhase = "live";
        revealAllBars();
        barHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        reflectionHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        motionProfiles.forEach((profile, index) => {
            profile.level = Math.min(
                1,
                Math.max(0, (currentHeights[index] - minimumHeight) / (maximumHeight - minimumHeight))
            );
        });
        liveImpulseStartedAt = null;
        liveImpulseStrength = Math.min(1, Math.max(0, initialImpulse));
        schedulePerspectiveEnvelope();
        syncMotion();
    };

    const showLive = () => {
        introMode = false;
        introAtRest = false;
        cancelIntroPulse();
        cancelIntroWave();
        volumeContainer.dataset.equalizerPhase = "live";
        revealAllBars();
        barHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        reflectionHolders.forEach((holder) => holder.classList.remove("is-intro-rest"));
        liveImpulseStartedAt = null;
        liveImpulseStrength = 0;
        syncMotion();
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

    const handleVisibilityChange = () => {
        previousFrameTimestamp = null;
        introPulsePreviousTimestamp = null;
        introWavePreviousTimestamp = null;
        if (!introMode) {
            syncMotion();
        }
    };

    const handleMotionPreference = () => {
        if (!introMode) {
            syncMotion();
        }
    };

    setStaticHeights();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener?.("change", handleMotionPreference);
    window.addEventListener("resize", schedulePerspectiveEnvelope, {passive: true});
    document.fonts?.ready.then(schedulePerspectiveEnvelope);
    if (stageIntro?.registerEqualizer) {
        stageIntro.registerEqualizer({
            barCount,
            introWaveDuration,
            prepareIntro,
            revealBar,
            pulse,
            startIntroWave,
            startLive,
            showLive
        });
    } else {
        showLive();
    }
})();
