import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const equalizerSource = await readFile(
    new URL("../../main/resources/static/js/eq_main.js", import.meta.url),
    "utf8"
);

class FakeClassList {
    constructor() {
        this.values = new Set();
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

const createHarness = ({coarsePointer = false, search = ""} = {}) => {
    let transformWrites = 0;
    let nextAnimationFrameId = 1;
    const animationFrames = new Map();

    const makeStyle = () => new Proxy({
        removeProperty() {},
        setProperty() {}
    }, {
        set(target, property, value) {
            if (property === "transform") {
                transformWrites += 1;
            }
            target[property] = value;
            return true;
        }
    });

    const makeElement = () => {
        const children = [];
        const element = {
            children,
            classList: new FakeClassList(),
            dataset: {},
            parentElement: null,
            style: makeStyle(),
            appendChild(child) {
                child.parentElement = element;
                children.push(child);
            },
            closest() {
                return null;
            },
            getBoundingClientRect() {
                return {bottom: 100, height: 100, left: 0, right: 100, top: 0, width: 100};
            },
            querySelector() {
                return null;
            },
            querySelectorAll() {
                return children;
            },
            setAttribute() {}
        };
        return element;
    };

    const volumeContainer = makeElement();
    const reflectionContainer = makeElement();
    const perspectiveHorizonPath = makeElement();
    const perspectiveCeilingPath = makeElement();
    const elements = new Map([
        ["volumeBars", volumeContainer],
        ["reflectionBars", reflectionContainer],
        ["perspectiveHorizonPath", perspectiveHorizonPath],
        ["perspectiveCeilingPath", perspectiveCeilingPath]
    ]);

    const document = {
        fonts: {ready: new Promise(() => {})},
        hidden: false,
        addEventListener() {},
        createElement() {
            return makeElement();
        },
        getElementById(id) {
            return elements.get(id) ?? null;
        }
    };

    const window = {
        cancelAnimationFrame(id) {
            animationFrames.delete(id);
        },
        location: {search},
        matchMedia(query) {
            return {
                addEventListener() {},
                matches: query.includes("any-pointer") ? coarsePointer : false
            };
        },
        requestAnimationFrame(callback) {
            const id = nextAnimationFrameId;
            nextAnimationFrameId += 1;
            animationFrames.set(id, callback);
            return id;
        },
        addEventListener() {}
    };

    vm.runInContext(equalizerSource, vm.createContext({
        Array,
        Math,
        Number,
        URLSearchParams,
        document,
        window
    }), {filename: "eq_main.js"});

    transformWrites = 0;

    const runEqualizerFrame = (timestamp) => {
        const frame = Array.from(animationFrames.entries())
            .find(([, callback]) => callback.name === "renderFrame");
        assert.ok(frame, "the live equalizer frame must be scheduled");
        const [id, callback] = frame;
        animationFrames.delete(id);
        callback(timestamp);
    };

    return {
        frameRate: volumeContainer.dataset.equalizerFrameRate,
        topSlope: volumeContainer.dataset.equalizerTopSlope,
        runEqualizerFrame,
        transformWrites: () => transformWrites
    };
};

test("coarse-pointer devices render the equalizer at 30 fps", () => {
    const harness = createHarness({coarsePointer: true});

    assert.equal(harness.frameRate, "30");
    assert.equal(harness.topSlope, "static");
    harness.runEqualizerFrame(16.7);
    assert.equal(harness.transformWrites(), 44);
    harness.runEqualizerFrame(33.4);
    assert.equal(harness.transformWrites(), 44);
    harness.runEqualizerFrame(50.1);
    assert.equal(harness.transformWrites(), 88);
});

test("desktop keeps display-rate rendering", () => {
    const harness = createHarness();

    assert.equal(harness.frameRate, "display");
    assert.equal(harness.topSlope, "dynamic");
    harness.runEqualizerFrame(16.7);
    harness.runEqualizerFrame(33.4);
    assert.equal(harness.transformWrites(), 88);
});

test("quality query overrides allow direct full/mobile comparison", () => {
    const forcedFull = createHarness({coarsePointer: true, search: "?quality=full"});
    const forcedMobile = createHarness({search: "?quality=mobile"});

    assert.equal(forcedFull.frameRate, "display");
    assert.equal(forcedFull.topSlope, "dynamic");
    assert.equal(forcedMobile.frameRate, "30");
    assert.equal(forcedMobile.topSlope, "static");
});

test("intro animation does not rewrite flat top slopes on every frame", () => {
    assert.doesNotMatch(
        equalizerSource.match(/const setIntroBarScale[\s\S]*?\n    };/)?.[0] ?? "",
        /--bar-top-(?:left|right)-inset/
    );
    assert.doesNotMatch(
        equalizerSource.match(/const setIntroRestScale[\s\S]*?\n    };/)?.[0] ?? "",
        /--bar-top-(?:left|right)-inset/
    );
});

test("all JavaScript equalizer loops use the same frame limiter", () => {
    assert.match(equalizerSource, /renderFrame = \(timestamp\) => \{\s+if \(!shouldRenderFrame/);
    assert.match(equalizerSource, /renderIntroPulse = \(timestamp\) => \{[\s\S]*shouldRenderFrame\(timestamp, introPulsePreviousTimestamp\)/);
    assert.match(equalizerSource, /renderIntroWave = \(timestamp\) => \{[\s\S]*shouldRenderFrame\(timestamp, introWavePreviousTimestamp\)/);
});
