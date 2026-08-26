(() => {
    "use strict";

    const carousel = document.querySelector("[data-quote-carousel]");
    if (!carousel) {
        return;
    }

    const track = carousel.querySelector("[data-carousel-track]");
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const previousButton = carousel.querySelector("[data-carousel-previous]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const pauseButton = carousel.querySelector("[data-carousel-pause]");
    const pauseIcon = carousel.querySelector("[data-carousel-pause-icon]");
    const pauseLabel = carousel.querySelector("[data-carousel-pause-label]");
    const currentCounter = carousel.querySelector("[data-carousel-current]");
    const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
    const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));

    if (!track || !viewport || slides.length === 0) {
        return;
    }

    const autoplayDelay = 7000;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const slideCount = slides.length;
    let activeIndex = 0;
    let trackPosition = slideCount > 1 ? 1 : 0;
    let autoplayTimer = null;
    let transitionTimer = null;
    let transitionInProgress = false;
    let userPaused = false;
    let pointerInside = false;
    let focusInside = false;
    let carouselVisible = true;
    let touchStartX = null;

    const setFocusable = (slide, enabled) => {
        slide.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((element) => {
            if (enabled) {
                element.removeAttribute("tabindex");
            } else {
                element.setAttribute("tabindex", "-1");
            }
        });
    };

    const prepareClone = (slide) => {
        const clone = slide.cloneNode(true);
        clone.removeAttribute("data-carousel-slide");
        clone.setAttribute("data-carousel-clone", "");
        clone.setAttribute("aria-hidden", "true");
        setFocusable(clone, false);
        return clone;
    };

    if (slideCount > 1) {
        track.prepend(prepareClone(slides[slideCount - 1]));
        track.append(prepareClone(slides[0]));
    }

    const setTrackPosition = (animate = true) => {
        const shouldAnimate = animate && !reducedMotion.matches;
        track.style.transition = shouldAnimate ? "" : "none";
        track.style.transform = `translate3d(${-trackPosition * 100}%, 0, 0)`;

        if (!shouldAnimate) {
            track.getBoundingClientRect();
            track.style.removeProperty("transition");
        }
    };

    const updatePauseControl = () => {
        if (!pauseButton) {
            return;
        }

        pauseButton.setAttribute("aria-pressed", String(userPaused));
        pauseButton.setAttribute("aria-label", userPaused ? "Play quote carousel" : "Pause quote carousel");

        if (pauseLabel) {
            pauseLabel.textContent = userPaused ? "Play" : "Pause";
        }
        if (pauseIcon) {
            pauseIcon.textContent = userPaused ? "▶" : "Ⅱ";
        }
    };

    const updateActiveSlide = () => {
        slides.forEach((slide, index) => {
            const active = index === activeIndex;
            slide.setAttribute("aria-hidden", String(!active));
            setFocusable(slide, active);
        });

        dots.forEach((dot, index) => {
            if (index === activeIndex) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }
        });

        if (currentCounter) {
            currentCounter.textContent = String(activeIndex + 1);
        }

        const artistName = slides[activeIndex].querySelector("h2")?.textContent?.trim();
        viewport.setAttribute(
            "aria-label",
            artistName
                ? `Quote ${activeIndex + 1} of ${slideCount}: ${artistName}`
                : `Quote ${activeIndex + 1} of ${slideCount}`
        );

        updatePauseControl();
    };

    const clearAutoplay = () => {
        if (autoplayTimer !== null) {
            window.clearTimeout(autoplayTimer);
            autoplayTimer = null;
        }
    };

    const autoplayIsPaused = () => (
        userPaused
        || pointerInside
        || focusInside
        || document.hidden
        || !carouselVisible
        || reducedMotion.matches
    );

    const scheduleAutoplay = () => {
        clearAutoplay();
        if (slideCount < 2 || autoplayIsPaused()) {
            return;
        }

        autoplayTimer = window.setTimeout(() => {
            moveBy(1);
        }, autoplayDelay);
    };

    const finishTransition = () => {
        if (!transitionInProgress) {
            return;
        }

        if (transitionTimer !== null) {
            window.clearTimeout(transitionTimer);
            transitionTimer = null;
        }

        if (trackPosition === 0) {
            trackPosition = slideCount;
            setTrackPosition(false);
        } else if (trackPosition === slideCount + 1) {
            trackPosition = 1;
            setTrackPosition(false);
        }

        transitionInProgress = false;
        scheduleAutoplay();
    };

    const startTransition = () => {
        transitionInProgress = true;
        if (reducedMotion.matches) {
            finishTransition();
            return;
        }

        transitionTimer = window.setTimeout(finishTransition, 900);
    };

    function moveBy(direction, userInitiated = false) {
        if (slideCount < 2 || transitionInProgress) {
            return;
        }

        activeIndex = (activeIndex + direction + slideCount) % slideCount;
        trackPosition += direction;
        setTrackPosition(true);
        updateActiveSlide();
        startTransition();

        if (userInitiated) {
            scheduleAutoplay();
        }
    }

    const moveTo = (targetIndex) => {
        if (transitionInProgress || targetIndex === activeIndex) {
            return;
        }

        activeIndex = targetIndex;
        trackPosition = targetIndex + 1;
        setTrackPosition(true);
        updateActiveSlide();
        startTransition();
        scheduleAutoplay();
    };

    track.addEventListener("transitionend", (event) => {
        if (event.target === track && event.propertyName === "transform") {
            finishTransition();
        }
    });

    previousButton?.addEventListener("click", () => moveBy(-1, true));
    nextButton?.addEventListener("click", () => moveBy(1, true));

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => moveTo(index));
    });

    pauseButton?.addEventListener("click", () => {
        userPaused = !userPaused;
        updatePauseControl();
        scheduleAutoplay();
    });

    carousel.addEventListener("pointerenter", () => {
        pointerInside = true;
        scheduleAutoplay();
    });

    carousel.addEventListener("pointerleave", () => {
        pointerInside = false;
        scheduleAutoplay();
    });

    carousel.addEventListener("focusin", () => {
        focusInside = true;
        scheduleAutoplay();
    });

    carousel.addEventListener("focusout", (event) => {
        if (!carousel.contains(event.relatedTarget)) {
            focusInside = false;
            scheduleAutoplay();
        }
    });

    viewport.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveBy(-1, true);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveBy(1, true);
        }
    });

    viewport.addEventListener("touchstart", (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, {passive: true});

    viewport.addEventListener("touchend", (event) => {
        if (touchStartX === null) {
            return;
        }

        const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
        const distance = touchEndX - touchStartX;
        touchStartX = null;

        if (Math.abs(distance) >= 45) {
            moveBy(distance < 0 ? 1 : -1, true);
        }
    }, {passive: true});

    document.addEventListener("visibilitychange", scheduleAutoplay);

    const handleMotionPreference = () => {
        if (transitionInProgress) {
            finishTransition();
        }
        scheduleAutoplay();
    };

    if (typeof reducedMotion.addEventListener === "function") {
        reducedMotion.addEventListener("change", handleMotionPreference);
    } else {
        reducedMotion.addListener(handleMotionPreference);
    }

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            carouselVisible = entries[0]?.isIntersecting ?? true;
            scheduleAutoplay();
        }, {threshold: 0.25});
        observer.observe(carousel);
    }

    carousel.classList.add("is-enhanced");
    setTrackPosition(false);
    updateActiveSlide();
    scheduleAutoplay();
})();
