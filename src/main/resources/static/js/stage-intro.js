(() => {
    "use strict";

    const body = document.body;
    if (!body?.classList.contains("home-page")) {
        return;
    }

    const storageKey = "yls.stage-intro.v3.seen";
    const queryMode = new URLSearchParams(window.location.search).get("intro");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lightStagger = 150;
    const sourceCollapseRatio = 0.18;
    const screenSweepRatio = 0.43;
    const seenThreshold = 10000;
    const timings = Object.freeze({
        lightStart: 1000,
        lightSweepDuration: 2100,
        aimStart: 3600,
        aimTransitionDuration: 1200,
        titleBacklit: 4800,
        equalizerLive: 7100,
        rigLive: 7200,
        buttonsStart: 7300,
        buttonsReady: 8350,
        carouselStart: 10300,
        carouselReady: 11180,
        sceneComplete: 11180
    });

    const readSeenMarker = () => {
        try {
            return window.localStorage.getItem(storageKey) === "1";
        } catch (_error) {
            return false;
        }
    };

    const writeSeenMarker = () => {
        try {
            window.localStorage.setItem(storageKey, "1");
        } catch (_error) {
            // A blocked storage API should never prevent the visual scene from completing.
        }
    };

    const hasSeenIntro = readSeenMarker();
    const forceReplay = queryMode === "replay";
    const forceSkip = queryMode === "skip";
    const shouldPlay = !reducedMotion.matches && !forceSkip && (forceReplay || !hasSeenIntro);
    const stageLights = Array.from(document.querySelectorAll(".stage-light"));
    const stageRig = document.querySelector(".stage-lights");
    const floorSpotLayer = document.querySelector(".stage-floor-spots");
    const floorSpots = Array.from(document.querySelectorAll(".stage-floor-spot"));
    const stageBoundary = document.querySelector(".stage-front-boundary");
    const title = document.querySelector("#site-title");
    const titleTargets = Array.from(title?.querySelectorAll("[data-title-target]") ?? []);
    const reflectionTargets = Array.from(document.querySelectorAll("[data-reflection-target]"));
    const navigation = document.querySelector(".site-navigation");
    const carousel = document.querySelector("[data-quote-carousel]");
    let equalizerApi = null;
    let carouselApi = null;
    let sceneStarted = false;
    let finalStateShown = false;
    let michaelAppeared = false;
    let markerWritten = hasSeenIntro;
    let elapsed = 0;
    let previousTimestamp = null;
    let sceneFrameId = null;
    let targetSyncFrameId = null;
    let stageTargetResizeObserver = null;
    let nextEventIndex = 0;
    let timeline = [];
    let lightGeometries = [];
    let lightAimProgress = stageLights.map(() => 0);
    let lightMotionComplete = stageLights.map(() => false);

    const sourceProgressFor = (index) => {
        if (stageLights.length <= 1) {
            return 0.5;
        }
        return 0.04 + (0.92 * index) / (stageLights.length - 1);
    };

    const clamp = (value, minimum = 0, maximum = 1) => (
        Math.min(maximum, Math.max(minimum, value))
    );

    const lerp = (start, end, progress) => start + (end - start) * progress;
    const easeInOut = (progress) => {
        const value = clamp(progress);
        return value < 0.5
            ? 4 * value * value * value
            : 1 - Math.pow(-2 * value + 2, 3) / 2;
    };
    const easeOut = (progress) => 1 - Math.pow(1 - clamp(progress), 3);
    const quadraticPoint = (start, control, end, progress) => {
        const inverse = 1 - progress;
        return {
            x: inverse * inverse * start.x
                + 2 * inverse * progress * control.x
                + progress * progress * end.x,
            y: inverse * inverse * start.y
                + 2 * inverse * progress * control.y
                + progress * progress * end.y
        };
    };
    const vectorFromSource = (source, point) => {
        const deltaX = point.x - source.x;
        const deltaY = Math.max(1, point.y - source.y);
        return {
            angle: -Math.atan2(deltaX, deltaY) * 180 / Math.PI,
            distance: Math.hypot(deltaX, deltaY)
        };
    };

    const applyStageLightMotion = (index, rawProgress) => {
        const light = stageLights[index];
        const geometry = lightGeometries[index];
        if (!light || !geometry) {
            return;
        }

        const progress = clamp(rawProgress);
        const floorSpot = floorSpots[index];
        let beamPoint = {x: geometry.source.x, y: geometry.source.y + 1};
        let beamOpacity = 0;
        let beamLengthScale = 0.025;
        let sourceGlareOpacity = 0.94;
        let sourceGlareScale = 1;
        let sourceGlareShiftX = 0;
        let sourceGlareShiftY = 0;
        let lightAngle = null;
        let floorSpotOpacity = 0;
        let floorSpotTransform = "translate3d(-200vw, -200vh, 0) scale3d(0.2, 0.2, 1)";

        if (progress > 0 && progress < sourceCollapseRatio) {
            const collapseProgress = easeInOut(progress / sourceCollapseRatio);
            const turnProgress = easeOut(collapseProgress) * 0.16;
            beamPoint = quadraticPoint(
                geometry.source,
                geometry.screenControl,
                geometry.screenExit,
                turnProgress
            );
            const turnEndPoint = quadraticPoint(
                geometry.source,
                geometry.screenControl,
                geometry.screenExit,
                0.16
            );
            lightAngle = lerp(
                0,
                vectorFromSource(geometry.source, turnEndPoint).angle,
                collapseProgress
            );
            const sourceFadeProgress = clamp((collapseProgress - 0.42) / 0.58);
            sourceGlareOpacity = 0.94 * (1 - easeInOut(sourceFadeProgress));
            sourceGlareScale = lerp(1, 0.18, collapseProgress);
            sourceGlareShiftX = lerp(
                0,
                geometry.sourceGlareExitX,
                collapseProgress
            );
            sourceGlareShiftY = lerp(
                0,
                geometry.sourceGlareExitY,
                collapseProgress
            );
            const lightVector = vectorFromSource(geometry.source, beamPoint);
            const beamRevealProgress = easeOut(
                clamp((collapseProgress - 0.2) / 0.55)
            );
            beamLengthScale = clamp(lightVector.distance / geometry.maxDistance, 0.025, 1);
            beamOpacity = 0.24 * beamRevealProgress;
        } else if (progress >= sourceCollapseRatio && progress < screenSweepRatio) {
            const screenProgress = easeInOut(
                (progress - sourceCollapseRatio)
                    / (screenSweepRatio - sourceCollapseRatio)
            );
            const screenPathProgress = lerp(0.16, 1, screenProgress);
            beamPoint = quadraticPoint(
                geometry.source,
                geometry.screenControl,
                geometry.screenExit,
                screenPathProgress
            );
            const lightVector = vectorFromSource(geometry.source, beamPoint);
            beamLengthScale = clamp(lightVector.distance / geometry.maxDistance, 0.025, 1);
            beamOpacity = lerp(0.24, 0.38, easeOut(screenProgress));
            sourceGlareOpacity = 0;
            sourceGlareScale = 0.16;
            sourceGlareShiftX = 0;
            sourceGlareShiftY = 0;
        } else if (progress >= screenSweepRatio) {
            const floorProgress = clamp(
                (progress - screenSweepRatio) / (1 - screenSweepRatio)
            );
            const easedFloorProgress = easeInOut(floorProgress);
            beamPoint = quadraticPoint(
                geometry.floorStart,
                geometry.floorControl,
                geometry.target,
                easedFloorProgress
            );
            const floorScaleX = lerp(
                geometry.floorStartScaleX,
                geometry.floorTargetScaleX,
                easedFloorProgress
            );
            const floorScaleY = lerp(
                geometry.floorStartScaleY,
                geometry.floorTargetScaleY,
                easedFloorProgress
            );
            const floorRotation = lerp(
                geometry.floorStartRotation,
                0,
                easedFloorProgress
            );
            const lightVector = vectorFromSource(geometry.source, beamPoint);
            beamLengthScale = clamp(lightVector.distance / geometry.maxDistance, 0.025, 1);
            beamOpacity = lerp(0.38, 0.34, easedFloorProgress);
            const floorPlaneProgress = clamp(
                (geometry.stageBoundaryY - beamPoint.y)
                    / geometry.floorRevealDistance
            );
            floorSpotOpacity = easeOut(floorPlaneProgress)
                * lerp(0.58, 0.48, easedFloorProgress);
            floorSpotTransform = `translate3d(${beamPoint.x.toFixed(3)}px, ${beamPoint.y.toFixed(3)}px, 0) translate3d(-50%, -50%, 0) rotate(${floorRotation.toFixed(3)}deg) scale3d(${floorScaleX.toFixed(4)}, ${floorScaleY.toFixed(4)}, 1)`;
            sourceGlareOpacity = 0;
            sourceGlareScale = 0.16;
            sourceGlareShiftX = 0;
            sourceGlareShiftY = 0;
        }

        const lightVector = vectorFromSource(geometry.source, beamPoint);
        const appliedLightAngle = lightAngle ?? lightVector.angle;
        light.style.transform = `translateX(-50%) rotate(${appliedLightAngle.toFixed(3)}deg)`;
        light.style.setProperty("--beam-length-scale", beamLengthScale.toFixed(5));
        light.style.setProperty("--beam-opacity", beamOpacity.toFixed(4));
        light.style.setProperty("--source-glare-opacity", sourceGlareOpacity.toFixed(4));
        light.style.setProperty("--source-glare-scale", sourceGlareScale.toFixed(4));
        light.style.setProperty("--source-glare-shift-x", `${sourceGlareShiftX.toFixed(3)}px`);
        light.style.setProperty("--source-glare-shift-y", `${sourceGlareShiftY.toFixed(3)}px`);

        if (floorSpot) {
            floorSpot.style.opacity = floorSpotOpacity.toFixed(4);
            floorSpot.style.transform = floorSpotTransform;
        }
        lightAimProgress[index] = progress;
    };

    const syncStageLightTargets = () => {
        if (!stageRig || !title || stageLights.length === 0) {
            return;
        }

        const stageRigRect = stageRig.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        const equalizerRect = stageRig.closest(".equalizer")?.getBoundingClientRect();
        const stageBoundaryRect = stageBoundary?.getBoundingClientRect();
        if (stageRigRect.width === 0 || titleRect.width === 0) {
            return;
        }

        const stageBoundaryY = stageBoundaryRect
            ? stageBoundaryRect.top + stageBoundaryRect.height / 2 - stageRigRect.top
            : (equalizerRect?.top ?? stageRigRect.top)
                + (equalizerRect?.height ?? stageRigRect.height) * 0.645
                - stageRigRect.top;

        floorSpotLayer?.style.setProperty(
            "--stage-floor-boundary-y",
            `${stageBoundaryY.toFixed(3)}px`
        );

        stageLights.forEach((light, index) => {
            const sourceProgress = sourceProgressFor(index);
            const source = {
                x: stageRigRect.width * sourceProgress,
                y: 0
            };
            const targetRect = titleTargets[index]?.getBoundingClientRect();
            const fallbackProgress = (index + 0.5) / stageLights.length;
            const targetX = targetRect
                ? targetRect.left + targetRect.width / 2
                : titleRect.left + titleRect.width * fallbackProgress;
            const targetY = targetRect
                ? targetRect.bottom + targetRect.height * 0.18
                : titleRect.bottom + titleRect.height * 0.18;
            const signedSideStrength = (sourceProgress - 0.5) / 0.46;
            const sideStrength = Math.min(1, Math.abs(signedSideStrength));
            const direction = index < (stageLights.length - 1) / 2 ? 1 : -1;
            const edgeInfluence = easeInOut(clamp((sideStrength - 0.24) / 0.44));
            const target = {
                x: targetX - stageRigRect.left,
                y: targetY - stageRigRect.top
            };
            const centralPathX = lerp(source.x, target.x, 0.18);
            const edgeExitX = source.x
                + direction * stageRigRect.width * (0.88 + sideStrength * 0.04);
            const screenExit = {
                x: lerp(centralPathX, edgeExitX, edgeInfluence),
                y: stageBoundaryY + stageRigRect.height * sideStrength * 0.018
            };
            const centralControlX = lerp(source.x, centralPathX, 0.45);
            const edgeControlX = source.x
                + direction * stageRigRect.width * (0.38 + sideStrength * 0.1);
            const screenControl = {
                x: lerp(centralControlX, edgeControlX, edgeInfluence),
                y: stageRigRect.height * (0.42 + (1 - sideStrength) * 0.08)
            };
            const floorStart = {
                x: screenExit.x,
                y: stageBoundaryY + stageRigRect.height * (0.045 + sideStrength * 0.025)
            };
            const floorControl = {
                x: (floorStart.x + target.x) / 2,
                y: (floorStart.y + target.y) / 2
                    - stageRigRect.height * (0.055 + sideStrength * 0.025)
            };
            const maximumVector = [screenExit, floorStart, target]
                .map((point) => vectorFromSource(source, point).distance)
                .reduce((maximum, distance) => Math.max(maximum, distance), 1);
            const maximumBeamWidth = clamp(maximumVector * 0.11, 52, 122);
            const floorStartRotation = (direction < 0 ? -6 : 6) * edgeInfluence;
            const sourceGlareOffset = clamp(
                stageRigRect.width * (0.018 + sideStrength * 0.012),
                10,
                28
            );

            lightGeometries[index] = {
                source,
                screenControl,
                screenExit,
                floorStart,
                floorControl,
                target,
                maxDistance: maximumVector,
                stageBoundaryY,
                floorRevealDistance: clamp(stageRigRect.height * 0.035, 8, 24),
                floorStartScaleX: 3.05 + edgeInfluence * 0.65,
                floorStartScaleY: 1.12 + edgeInfluence * 0.13,
                floorTargetScaleX: 0.72 + (1 - sideStrength) * 0.1,
                floorTargetScaleY: 0.58 + (1 - sideStrength) * 0.08,
                floorStartRotation,
                sourceGlareExitX: direction * sourceGlareOffset * edgeInfluence,
                sourceGlareExitY: sourceGlareOffset * (1 - edgeInfluence) * 0.55
            };

            light.style.setProperty("--light-x", `${(sourceProgress * 100).toFixed(3)}%`);
            light.style.setProperty("--intro-beam-max-distance", `${maximumVector.toFixed(3)}px`);
            light.style.setProperty("--intro-beam-max-width", `${maximumBeamWidth.toFixed(3)}px`);
            applyStageLightMotion(index, lightAimProgress[index] ?? 0);
        });
    };

    const scheduleStageLightTargetSync = () => {
        if (targetSyncFrameId !== null) {
            window.cancelAnimationFrame(targetSyncFrameId);
        }

        targetSyncFrameId = window.requestAnimationFrame(() => {
            targetSyncFrameId = window.requestAnimationFrame(() => {
                targetSyncFrameId = null;
                syncStageLightTargets();
            });
        });
    };

    const revealTitleTarget = (index) => {
        titleTargets[index]?.classList.add("is-revealed");
        reflectionTargets[index]?.classList.add("is-revealed");
    };

    const revealAllTitleTargets = () => {
        titleTargets.forEach((_, index) => revealTitleTarget(index));
    };

    const setInteractive = (element, interactive) => {
        if (!element) {
            return;
        }

        element.toggleAttribute("inert", !interactive);
        element.inert = !interactive;
        if (interactive) {
            element.removeAttribute("aria-hidden");
        } else {
            element.setAttribute("aria-hidden", "true");
        }
    };

    const maybeRememberIntro = () => {
        if (!markerWritten && elapsed >= seenThreshold && michaelAppeared) {
            writeSeenMarker();
            markerWritten = true;
        }
    };

    const showFinalState = (mode) => {
        lightAimProgress = stageLights.map(() => 1);
        lightMotionComplete = stageLights.map(() => true);
        revealAllTitleTargets();
        finalStateShown = true;
        body.classList.remove(
            "stage-intro-pending",
            "stage-intro-playing",
            "stage-intro-paused",
            "stage-title-flight",
            "stage-title-reflected",
            "stage-title-settled",
            "stage-title-backlit",
            "stage-buttons-enter",
            "stage-carousel-enter"
        );
        body.classList.add("stage-intro-complete", "stage-rig-live", "stage-backlight-live");
        body.dataset.stageScene = "complete";
        body.dataset.stageIntroMode = mode;
        syncStageLightTargets();
        stageLights.forEach((light, index) => {
            light.classList.remove("is-intro-lit");
            light.classList.remove("is-aiming");
            light.classList.add("is-aimed");
            applyStageLightMotion(index, 1);
        });
        floorSpots.forEach((floorSpot) => {
            floorSpot.classList.remove("is-floor-tracking");
            floorSpot.classList.add("is-floor-settled");
        });
        setInteractive(navigation, true);
        setInteractive(carousel, true);
        if (!sceneStarted) {
            equalizerApi?.showLive();
            carouselApi?.showImmediately();
        }
    };

    const stageIntro = {
        shouldPlay,
        timings,
        registerEqualizer(api) {
            equalizerApi = api;
            if (shouldPlay && !finalStateShown) {
                equalizerApi.prepareIntro();
            } else {
                equalizerApi.showLive();
            }
        },
        registerCarousel(api) {
            carouselApi = api;
            if (shouldPlay && !finalStateShown) {
                carouselApi.prepareIntro();
            } else {
                carouselApi.showImmediately();
            }
        }
    };

    window.yourLiveSoundStageIntro = stageIntro;

    window.addEventListener("resize", scheduleStageLightTargetSync, {passive: true});
    document.fonts?.ready.then(scheduleStageLightTargetSync);
    if ("ResizeObserver" in window && stageRig && title) {
        stageTargetResizeObserver = new ResizeObserver(scheduleStageLightTargetSync);
        stageTargetResizeObserver.observe(stageRig);
        stageTargetResizeObserver.observe(title);
    }

    if (!shouldPlay) {
        const mode = reducedMotion.matches
            ? "reduced-motion"
            : forceSkip
                ? "skip"
                : "seen";
        showFinalState(mode);
        return;
    }

    body.dataset.stageIntroMode = forceReplay ? "replay" : "first-visit";
    setInteractive(navigation, false);
    setInteractive(carousel, false);

    const addEvent = (at, action) => {
        timeline.push({at, action});
    };

    const updateStageLightMotion = () => {
        stageLights.forEach((light, index) => {
            const aimAt = timings.aimStart + index * lightStagger;
            const progress = clamp(
                (elapsed - aimAt) / timings.aimTransitionDuration
            );
            const floorSpot = floorSpots[index];

            if (progress <= 0 || (progress >= 1 && lightMotionComplete[index])) {
                return;
            }

            light.classList.add("is-aiming");
            if (progress < 1) {
                lightMotionComplete[index] = false;
                light.classList.remove("is-aimed");
                floorSpot?.classList.toggle(
                    "is-floor-tracking",
                    progress >= screenSweepRatio
                );
                floorSpot?.classList.remove("is-floor-settled");
            } else {
                lightMotionComplete[index] = true;
                light.classList.remove("is-aiming");
                light.classList.add("is-aimed");
                floorSpot?.classList.remove("is-floor-tracking");
                floorSpot?.classList.add("is-floor-settled");
            }
            applyStageLightMotion(index, progress);
        });
    };

    const buildTimeline = () => {
        stageLights.forEach((light, index) => {
            addEvent(timings.lightStart + index * lightStagger, () => {
                light.classList.add("is-intro-lit");
            });

            const aimAt = timings.aimStart + index * lightStagger;
            addEvent(aimAt + timings.aimTransitionDuration, () => {
                revealTitleTarget(index);
            });
        });

        const equalizerBarCount = equalizerApi?.barCount ?? 22;
        const finalBarIndex = Math.max(1, equalizerBarCount - 1);
        for (let index = 0; index < equalizerBarCount; index += 1) {
            const revealAt = timings.lightStart
                + (index / finalBarIndex) * timings.lightSweepDuration;
            addEvent(revealAt, () => equalizerApi?.revealBar(index));
        }

        addEvent(timings.titleBacklit, () => body.classList.add("stage-title-backlit"));
        addEvent(timings.equalizerLive, () => equalizerApi?.startLive());
        addEvent(timings.rigLive, () => body.classList.add("stage-rig-live"));
        addEvent(timings.buttonsStart, () => body.classList.add("stage-buttons-enter"));
        addEvent(timings.buttonsReady, () => setInteractive(navigation, true));
        addEvent(timings.carouselStart, () => {
            michaelAppeared = true;
            body.classList.add("stage-carousel-enter");
            carouselApi?.beginReveal();
            maybeRememberIntro();
        });
        addEvent(seenThreshold, maybeRememberIntro);
        addEvent(timings.carouselReady, () => {
            carouselApi?.finishReveal();
            maybeRememberIntro();
        });
        addEvent(timings.sceneComplete, () => showFinalState("completed"));

        timeline.sort((left, right) => left.at - right.at);
    };

    const runSceneFrame = (timestamp) => {
        if (!document.hidden) {
            if (previousTimestamp !== null) {
                elapsed += Math.max(0, timestamp - previousTimestamp);
            }
            previousTimestamp = timestamp;
            updateStageLightMotion();

            while (nextEventIndex < timeline.length && elapsed >= timeline[nextEventIndex].at) {
                timeline[nextEventIndex].action();
                nextEventIndex += 1;
            }
        }

        if (!finalStateShown) {
            sceneFrameId = window.requestAnimationFrame(runSceneFrame);
        } else {
            sceneFrameId = null;
        }
    };

    const startScene = () => {
        if (sceneStarted) {
            return;
        }

        sceneStarted = true;
        syncStageLightTargets();
        buildTimeline();
        body.classList.remove("stage-intro-pending");
        body.classList.add("stage-intro-playing");
        body.dataset.stageScene = "intro";
        sceneFrameId = window.requestAnimationFrame(runSceneFrame);
    };

    const waitForWindowLoad = () => new Promise((resolve) => {
        if (document.readyState === "complete") {
            resolve();
            return;
        }
        window.addEventListener("load", resolve, {once: true});
    });

    const waitForPortraits = async () => {
        const portraits = Array.from(carousel?.querySelectorAll("[data-carousel-slide] img") ?? []);
        await Promise.all(portraits.map(async (portrait) => {
            portrait.loading = "eager";
            if (typeof portrait.decode !== "function") {
                return;
            }
            try {
                await portrait.decode();
            } catch (_error) {
                // The load event is the fallback when decode is unsupported or rejects.
            }
        }));
    };

    const waitForNextPaint = () => new Promise((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });

    document.addEventListener("visibilitychange", () => {
        previousTimestamp = null;
        body.classList.toggle("stage-intro-paused", document.hidden && sceneStarted && !finalStateShown);
    });

    Promise.allSettled([
        waitForWindowLoad(),
        document.fonts?.ready ?? Promise.resolve(),
        waitForPortraits()
    ]).then(waitForNextPaint).then(startScene);
})();
