import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const equalizerStylesheet = await readFile(
    new URL("../../main/resources/static/css/eq_main.css", import.meta.url),
    "utf8"
);
const introStylesheet = await readFile(
    new URL("../../main/resources/static/css/stage-intro.css", import.meta.url),
    "utf8"
);

const mobileMediaStart = equalizerStylesheet.indexOf(
    "@media (any-pointer: coarse), (max-width: 820px)"
);
const reducedMotionStart = equalizerStylesheet.indexOf(
    "@media (prefers-reduced-motion: reduce)",
    mobileMediaStart
);
const mobileEqualizerRules = equalizerStylesheet.slice(
    mobileMediaStart,
    reducedMotionStart
);
const mobileIntroStart = introStylesheet.lastIndexOf(
    "@media (any-pointer: coarse), (max-width: 820px)"
);
const mobileIntroRules = introStylesheet.slice(mobileIntroStart);

test("mobile lighting removes redundant filters from gradient-softened layers", () => {
    assert.notEqual(mobileMediaStart, -1);
    assert.notEqual(reducedMotionStart, -1);
    assert.match(mobileEqualizerRules, /\.stage-lights \{[\s\S]*?filter: none;/);
    assert.match(mobileEqualizerRules, /\.stage-lights \.stage-light::after,/);
    assert.match(mobileEqualizerRules, /\.stage-lights \.moving-head::after,/);
    assert.match(mobileEqualizerRules, /\.reflection-container \.bar,/);
    assert.match(mobileEqualizerRules, /\.reflection-title \{[\s\S]*?filter: none;/);
});

test("mobile equalizer containers use depth opacity without group filters", () => {
    assert.match(mobileEqualizerRules, /\.bar-container \{[\s\S]*?filter: none;/);
});

test("mobile floor spots rely on their radial gradient instead of blur", () => {
    assert.notEqual(mobileIntroStart, -1);
    assert.match(mobileIntroRules, /\.stage-floor-spot,[\s\S]*?filter: none;/);
    assert.match(introStylesheet, /\.stage-floor-spot \{[\s\S]*?background: radial-gradient\([\s\S]*?filter: blur\(/);
});

test("desktop keeps the original lighting filters", () => {
    assert.match(equalizerStylesheet, /\.stage-light::after \{[\s\S]*?filter: blur\(/);
    assert.match(equalizerStylesheet, /\.moving-head::after \{[\s\S]*?filter: blur\(/);
    assert.match(equalizerStylesheet, /\.reflection-container \.bar \{[\s\S]*?filter: blur\(/);
    assert.match(equalizerStylesheet, /\.reflection-title \{[\s\S]*?filter: blur\(/);
    assert.match(
        equalizerStylesheet,
        /\.bar-container \{[\s\S]*?filter:[\s\S]*?brightness\([\s\S]*?saturate\(/
    );
});
