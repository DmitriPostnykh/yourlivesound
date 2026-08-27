(() => {
    "use strict";

    const body = document.body;
    if (!body?.classList.contains("home-page")) {
        return;
    }

    const storageKey = "yls.stage-intro.v1.seen";
    const queryMode = new URLSearchParams(window.location.search).get("intro");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lightStagger = 150;
    const seenThreshold = 10000;
    const timings = Object.freeze({
        lightStart: 1000,
        lightSweepDuration: 1650,
        titleStart: 3000,
        firstImpact: 3912,
        secondImpact: 4425,
        thirdImpact: 4729,
        titleSettled: 4900,
        rigLive: 6285,
        buttonsStart: 6385,
        buttonsReady: 7435,
        carouselStart: 9285,
        carouselReady: 10165
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
    let nextEventIndex = 0;
    let timeline = [];

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
        finalStateShown = true;
        body.classList.remove(
            "stage-intro-pending",
            "stage-intro-playing",
            "stage-intro-paused",
            "stage-title-flight",
            "stage-title-reflected",
            "stage-title-settled",
            "stage-buttons-enter",
            "stage-carousel-enter"
        );
        body.classList.add("stage-intro-complete", "stage-rig-live");
        body.dataset.stageScene = "complete";
        body.dataset.stageIntroMode = mode;
        stageLights.forEach((light) => light.classList.remove("is-intro-lit", "is-aimed"));
        setInteractive(navigation, true);
        setInteractive(carousel, true);
        equalizerApi?.showLive();
        carouselApi?.showImmediately();
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

            addEvent(timings.firstImpact + index * lightStagger, () => {
                light.classList.add("is-aimed");
            });
        });

        const equalizerBarCount = equalizerApi?.barCount ?? 22;
        const finalBarIndex = Math.max(1, equalizerBarCount - 1);
        for (let index = 0; index < equalizerBarCount; index += 1) {
            const revealAt = timings.lightStart
                + (index / finalBarIndex) * timings.lightSweepDuration;
            addEvent(revealAt, () => equalizerApi?.revealBar(index));
        }

        addEvent(timings.titleStart, () => body.classList.add("stage-title-flight"));
        addEvent(timings.firstImpact, () => {
            body.classList.add("stage-title-reflected");
            equalizerApi?.pulse(0.72);
        });
        addEvent(timings.secondImpact, () => equalizerApi?.pulse(0.48));
        addEvent(timings.thirdImpact, () => equalizerApi?.startLive(0.34));
        addEvent(timings.titleSettled, () => {
            body.classList.remove("stage-title-flight");
            body.classList.add("stage-title-settled");
        });
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
            showFinalState("completed");
        });

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
