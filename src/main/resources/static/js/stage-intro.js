(() => {
    "use strict";

    const body = document.body;
    if (!body?.classList.contains("home-page")) {
        return;
    }

    const storageKey = "yls.stage-intro.v2.seen";
    const queryMode = new URLSearchParams(window.location.search).get("intro");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lightStagger = 150;
    const seenThreshold = 10000;
    const timings = Object.freeze({
        lightStart: 1000,
        lightSweepDuration: 2100,
        aimStart: 3200,
        aimTransitionDuration: 900,
        titleBacklit: 4100,
        equalizerLive: 6200,
        rigLive: 6300,
        buttonsStart: 6400,
        buttonsReady: 7450,
        carouselStart: 9300,
        carouselReady: 10180,
        sceneComplete: 10180
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
    const title = document.querySelector("#site-title");
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
    let nextEventIndex = 0;
    let timeline = [];

    const getTitleTargetCenters = () => {
        if (!title) {
            return [];
        }

        const words = Array.from(title.querySelectorAll(":scope > span"));
        const targetCenters = [];
        const range = document.createRange();

        words.forEach((word, wordIndex) => {
            const textNode = Array.from(word.childNodes).find((node) => (
                node.nodeType === Node.TEXT_NODE && node.textContent.length > 0
            ));

            if (textNode) {
                for (let characterIndex = 0; characterIndex < textNode.textContent.length; characterIndex += 1) {
                    range.setStart(textNode, characterIndex);
                    range.setEnd(textNode, characterIndex + 1);
                    const characterRect = range.getBoundingClientRect();
                    targetCenters.push(characterRect.left + characterRect.width / 2);
                }
            }

            const nextWord = words[wordIndex + 1];
            if (nextWord) {
                const wordRect = word.getBoundingClientRect();
                const nextWordRect = nextWord.getBoundingClientRect();
                targetCenters.push((wordRect.right + nextWordRect.left) / 2);
            }
        });

        range.detach?.();
        return targetCenters;
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

        const measuredCenters = getTitleTargetCenters();
        const targetCenters = measuredCenters.length === stageLights.length
            ? measuredCenters
            : stageLights.map((_, index) => (
                titleRect.left + titleRect.width * ((index + 0.5) / stageLights.length)
            ));
        const targetY = titleRect.top + titleRect.height * 0.52;
        const backlightDrop = Math.max(0, targetY - stageRigRect.top);

        stageLights.forEach((light, index) => {
            const targetX = ((targetCenters[index] - stageRigRect.left) / stageRigRect.width) * 100;
            light.style.setProperty("--light-x", `${Math.min(100, Math.max(0, targetX))}%`);
            light.style.setProperty("--intro-backlight-drop", `${backlightDrop}px`);
            light.style.setProperty("--backlight-tilt", "0deg");
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

            addEvent(timings.aimStart + index * lightStagger, () => {
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

    window.addEventListener("resize", scheduleStageLightTargetSync, {passive: true});
    document.fonts?.ready.then(scheduleStageLightTargetSync);

    Promise.allSettled([
        waitForWindowLoad(),
        document.fonts?.ready ?? Promise.resolve(),
        waitForPortraits()
    ]).then(waitForNextPaint).then(startScene);
})();
