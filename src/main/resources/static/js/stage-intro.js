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
    const titleRevealDuration = 260;
    const floorContactDelay = 480;
    const seenThreshold = 10000;
    const timings = Object.freeze({
        lightStart: 1000,
        lightSweepDuration: 2100,
        aimStart: 3600,
        aimTransitionDuration: 900,
        titleBacklit: 4240,
        equalizerLive: 6600,
        rigLive: 6700,
        buttonsStart: 6800,
        buttonsReady: 7850,
        carouselStart: 9700,
        carouselReady: 10580,
        sceneComplete: 10580
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
    const floorSpots = Array.from(document.querySelectorAll(".stage-floor-spot"));
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

    const sourceProgressFor = (index) => {
        if (stageLights.length <= 1) {
            return 0.5;
        }
        return 0.04 + (0.92 * index) / (stageLights.length - 1);
    };

    const syncStageLightTargets = () => {
        if (!stageRig || !title || stageLights.length === 0) {
            return;
        }

        const stageRigRect = stageRig.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        if (stageRigRect.width === 0 || titleRect.width === 0) {
            return;
        }

        stageLights.forEach((light, index) => {
            const sourceProgress = sourceProgressFor(index);
            const sourceX = stageRigRect.left + stageRigRect.width * sourceProgress;
            const sourceY = stageRigRect.top;
            const targetRect = titleTargets[index]?.getBoundingClientRect();
            const fallbackProgress = (index + 0.5) / stageLights.length;
            const targetX = targetRect
                ? targetRect.left + targetRect.width / 2
                : titleRect.left + titleRect.width * fallbackProgress;
            const targetY = targetRect
                ? targetRect.top + targetRect.height * 0.55
                : titleRect.top + titleRect.height * 0.55;
            const deltaX = targetX - sourceX;
            const deltaY = Math.max(1, targetY - sourceY);
            const angle = -Math.atan2(deltaX, deltaY) * 180 / Math.PI;
            const distance = Math.hypot(deltaX, deltaY);
            const signedSideStrength = (sourceProgress - 0.5) / 0.46;
            const sideStrength = Math.min(1, Math.abs(signedSideStrength));
            const floorStartOffsetX = -signedSideStrength * stageRigRect.width * 0.34;
            const floorStartOffsetY = stageRigRect.height * (0.035 + sideStrength * 0.045);
            const floorSpot = floorSpots[index];

            light.style.setProperty("--light-x", `${(sourceProgress * 100).toFixed(3)}%`);
            light.style.setProperty("--backlight-tilt", `${angle.toFixed(3)}deg`);
            light.style.setProperty("--intro-backlight-distance", `${distance.toFixed(3)}px`);
            floorSpot?.style.setProperty("--floor-target-x", `${(targetX - stageRigRect.left).toFixed(3)}px`);
            floorSpot?.style.setProperty("--floor-target-y", `${(targetY - stageRigRect.top).toFixed(3)}px`);
            floorSpot?.style.setProperty("--floor-start-offset-x", `${floorStartOffsetX.toFixed(3)}px`);
            floorSpot?.style.setProperty("--floor-start-offset-y", `${floorStartOffsetY.toFixed(3)}px`);
            floorSpot?.style.setProperty(
                "--floor-tracking-duration",
                `${timings.aimTransitionDuration - floorContactDelay}ms`
            );
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
        syncStageLightTargets();
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
        stageLights.forEach((light) => {
            light.classList.remove("is-intro-lit");
            light.classList.add("is-aimed");
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

    const buildTimeline = () => {
        stageLights.forEach((light, index) => {
            addEvent(timings.lightStart + index * lightStagger, () => {
                light.classList.add("is-intro-lit");
            });

            const aimAt = timings.aimStart + index * lightStagger;
            addEvent(aimAt, () => {
                light.classList.add("is-aimed");
            });
            addEvent(aimAt + floorContactDelay, () => {
                floorSpots[index]?.classList.add("is-floor-tracking");
            });
            addEvent(aimAt + timings.aimTransitionDuration - titleRevealDuration, () => {
                revealTitleTarget(index);
            });
            addEvent(aimAt + timings.aimTransitionDuration, () => {
                floorSpots[index]?.classList.remove("is-floor-tracking");
                floorSpots[index]?.classList.add("is-floor-settled");
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
