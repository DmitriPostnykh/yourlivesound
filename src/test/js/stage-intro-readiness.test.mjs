import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const introSource = await readFile(
    new URL("../../main/resources/static/js/stage-intro.js", import.meta.url),
    "utf8"
);

class FakeClassList {
    constructor(...classNames) {
        this.values = new Set(classNames);
    }

    contains(className) {
        return this.values.has(className);
    }

    add(...classNames) {
        classNames.forEach((className) => this.values.add(className));
    }

    remove(...classNames) {
        classNames.forEach((className) => this.values.delete(className));
    }

    toggle(className, force) {
        const shouldAdd = force ?? !this.values.has(className);
        if (shouldAdd) {
            this.values.add(className);
        } else {
            this.values.delete(className);
        }
        return shouldAdd;
    }
}

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {promise, reject, resolve};
};

const makeElement = (...classNames) => {
    const attributes = new Map();
    const styleValues = new Map();
    return {
        attributes,
        classList: new FakeClassList(...classNames),
        dataset: {},
        inert: false,
        style: {
            removeProperty(name) {
                styleValues.delete(name);
            },
            setProperty(name, value) {
                styleValues.set(name, value);
            }
        },
        closest() {
            return null;
        },
        getBoundingClientRect() {
            return {bottom: 100, height: 20, left: 0, top: 80, width: 100};
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        },
        removeAttribute(name) {
            attributes.delete(name);
        },
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        toggleAttribute(name, force) {
            if (force) {
                attributes.set(name, "");
            } else {
                attributes.delete(name);
            }
        }
    };
};

const flushMicrotasks = async () => {
    for (let index = 0; index < 8; index += 1) {
        await Promise.resolve();
    }
};

const createHarness = ({
    fontsReady = Promise.resolve(),
    readyState = "complete",
    reducedMotion = false,
    search = "?intro=replay",
    seen = false
} = {}) => {
    const body = makeElement("home-page", "stage-intro-pending");
    body.dataset.stageScene = "preload";
    const title = makeElement("title");
    const navigation = makeElement("site-navigation");
    const carousel = makeElement("quote-carousel");
    let portraitQueryCount = 0;
    carousel.querySelectorAll = () => {
        portraitQueryCount += 1;
        throw new Error("StageIntro must not inspect or preload carousel portraits");
    };

    const documentEvents = new Map();
    const windowEvents = new Map();
    const marks = [];
    const animationFrames = new Map();
    const timers = new Map();
    let storageReads = 0;
    let storageWrites = 0;
    let clock = 0;
    let nextAnimationFrameId = 1;
    let nextTimerId = 1;

    const document = {
        body,
        fonts: {ready: fontsReady},
        hidden: false,
        readyState,
        addEventListener(name, callback) {
            documentEvents.set(name, callback);
        },
        querySelector(selector) {
            if (selector === "#site-title") {
                return title;
            }
            if (selector === ".site-navigation") {
                return navigation;
            }
            if (selector === "[data-quote-carousel]") {
                return carousel;
            }
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };

    const window = {
        cancelAnimationFrame(id) {
            animationFrames.delete(id);
        },
        clearTimeout(id) {
            timers.delete(id);
        },
        innerWidth: 390,
        localStorage: {
            getItem() {
                storageReads += 1;
                return seen ? "1" : null;
            },
            setItem() {
                storageWrites += 1;
            }
        },
        location: {search},
        matchMedia() {
            return {
                addEventListener() {},
                addListener() {},
                matches: reducedMotion
            };
        },
        performance: {
            mark(name) {
                marks.push(name);
            },
            now() {
                return clock;
            }
        },
        requestAnimationFrame(callback) {
            const id = nextAnimationFrameId;
            nextAnimationFrameId += 1;
            animationFrames.set(id, callback);
            return id;
        },
        setTimeout(callback, delay) {
            const id = nextTimerId;
            nextTimerId += 1;
            timers.set(id, {callback, delay});
            return id;
        },
        addEventListener(name, callback) {
            windowEvents.set(name, callback);
        }
    };

    const context = vm.createContext({
        Array,
        Date,
        Math,
        Number,
        Object,
        Promise,
        String,
        URLSearchParams,
        console,
        document,
        window
    });
    vm.runInContext(introSource, context, {filename: "stage-intro.js"});

    return {
        animationFrames,
        body,
        document,
        marks,
        portraitQueries: () => portraitQueryCount,
        storageReads: () => storageReads,
        storageWrites: () => storageWrites,
        runDeadline() {
            const deadline = Array.from(timers.entries())
                .find(([, timer]) => timer.delay === 2500);
            assert.ok(deadline, "the bounded readiness deadline must be scheduled");
            const [id, timer] = deadline;
            timers.delete(id);
            clock = timer.delay;
            timer.callback();
        },
        async runNextAnimationFrame() {
            const queuedFrames = Array.from(animationFrames.entries());
            animationFrames.clear();
            clock += 16;
            queuedFrames.forEach(([, callback]) => callback(clock));
            await flushMicrotasks();
        },
        timers,
        windowEvents
    };
};

test("ready blockers settle and start the intro exactly once", async () => {
    const harness = createHarness();

    await flushMicrotasks();
    await harness.runNextAnimationFrame();
    await harness.runNextAnimationFrame();

    assert.equal(harness.body.dataset.stageIntroStartReason, "ready");
    assert.equal(harness.body.dataset.stageScene, "intro");
    assert.equal(harness.body.classList.contains("stage-intro-playing"), true);
    assert.equal(harness.portraitQueries(), 0);
    assert.equal(
        harness.marks.filter((mark) => mark.startsWith("yls-stage-intro:scene-start-")).length,
        1
    );
    assert.equal(harness.timers.size, 0, "ready startup must cancel its deadline");
});

test("a stalled load or font promise cannot leave the page pending", async () => {
    const fonts = deferred();
    const harness = createHarness({fontsReady: fonts.promise, readyState: "loading"});

    harness.runDeadline();

    assert.equal(harness.body.dataset.stageIntroStartReason, "deadline");
    assert.equal(harness.body.dataset.stageScene, "intro");
    assert.equal(harness.body.classList.contains("stage-intro-pending"), false);

    harness.windowEvents.get("load")?.();
    fonts.resolve();
    await flushMicrotasks();
    await harness.runNextAnimationFrame();
    await harness.runNextAnimationFrame();

    assert.equal(harness.body.dataset.stageIntroStartReason, "deadline");
    assert.equal(harness.portraitQueries(), 0);
    assert.equal(
        harness.marks.filter((mark) => mark.startsWith("yls-stage-intro:scene-start-")).length,
        1,
        "late readiness completion must not start a second scene"
    );
});

test("a prior seen marker cannot suppress a normal reload", async () => {
    const harness = createHarness({search: "", seen: true});

    await flushMicrotasks();
    await harness.runNextAnimationFrame();
    await harness.runNextAnimationFrame();

    assert.equal(harness.body.dataset.stageIntroMode, "standard");
    assert.equal(harness.body.dataset.stageScene, "intro");
    assert.equal(harness.body.classList.contains("stage-intro-playing"), true);
    assert.equal(harness.storageReads(), 0);
    assert.equal(harness.storageWrites(), 0);
});

test("skip mode becomes interactive without waiting for readiness", () => {
    const fonts = deferred();
    const harness = createHarness({
        fontsReady: fonts.promise,
        readyState: "loading",
        search: "?intro=skip"
    });

    assert.equal(harness.body.dataset.stageIntroMode, "skip");
    assert.equal(harness.body.dataset.stageScene, "complete");
    assert.equal(harness.body.classList.contains("stage-intro-complete"), true);
    assert.equal(harness.timers.size, 0);
    assert.equal(harness.portraitQueries(), 0);
});
