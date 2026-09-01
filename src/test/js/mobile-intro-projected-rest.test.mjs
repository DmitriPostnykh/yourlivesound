import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const equalizerSource = await readFile(
    new URL("../../main/resources/static/js/eq_main.js", import.meta.url),
    "utf8"
);
const introStylesheet = await readFile(
    new URL("../../main/resources/static/css/stage-intro.css", import.meta.url),
    "utf8"
);

test("mobile intro derives each resting baseline from the projected floor arc", () => {
    assert.match(equalizerSource, /"uses-mobile-projected-intro-rest",\s*useMobileFrameRate/);
    assert.match(equalizerSource, /"--intro-rest-angle"[\s\S]*Math\.atan2\(bottomRightY - bottomLeftY, rect\.width\)/);
    assert.match(equalizerSource, /"--intro-rest-bottom"[\s\S]*boundingBottom - \(bottomLeftY \+ bottomRightY\) \/ 2/);
});

test("mobile resting bars keep the perspective polygon instead of snapping flat", () => {
    const projectedRestRule = introStylesheet.match(
        /#volumeBars\.uses-mobile-projected-intro-rest\[data-equalizer-phase\^="intro"\][\s\S]*?\.bar-container\.is-intro-rest \{[\s\S]*?\n    \}/
    )?.[0] ?? "";

    assert.notEqual(projectedRestRule, "");
    assert.match(projectedRestRule, /--bar-left-inset/);
    assert.match(projectedRestRule, /--bar-right-inset/);
    assert.doesNotMatch(projectedRestRule, /clip-path: inset\(0\)/);
});

test("mobile intro renders a two-pixel sloped baseline without a filter", () => {
    const projectedBaselineRule = introStylesheet.match(
        /#volumeBars\.uses-mobile-projected-intro-rest\[data-equalizer-phase\^="intro"\][\s\S]*?\.bar-container::after \{[\s\S]*?\n    \}/
    )?.[0] ?? "";

    assert.notEqual(projectedBaselineRule, "");
    assert.match(projectedBaselineRule, /height: 2px/);
    assert.match(projectedBaselineRule, /rotate\(var\(--intro-rest-angle, 0deg\)\)/);
    assert.match(projectedBaselineRule, /bottom: var\(--intro-rest-bottom, 0px\)/);
    assert.doesNotMatch(projectedBaselineRule, /filter:/);
});

test("the existing desktop rest behavior remains unchanged", () => {
    assert.match(
        introStylesheet,
        /\.bar-container\.is-intro-rest,\s*\.reflection-container \.bar-container\.is-intro-rest \{\s*-webkit-clip-path: inset\(0\);\s*clip-path: inset\(0\);/
    );
});
