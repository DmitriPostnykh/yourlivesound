import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const equalizerSource = await readFile(
    new URL("../../main/resources/static/js/eq_main.js", import.meta.url),
    "utf8"
);
const equalizerStylesheet = await readFile(
    new URL("../../main/resources/static/css/eq_main.css", import.meta.url),
    "utf8"
);

test("mobile intro suppresses reflection paint without collapsing its layout slot", () => {
    const suppressionRule = equalizerStylesheet.match(
        /\.reflection-container\.is-mobile-intro-suppressed \{[\s\S]*?\n\}/
    )?.[0] ?? "";

    assert.match(suppressionRule, /visibility: hidden;/);
    assert.match(suppressionRule, /pointer-events: none;/);
    assert.doesNotMatch(suppressionRule, /display:\s*none/);
    assert.match(
        equalizerStylesheet,
        /\.reflection-container\.is-mobile-intro-suppressed \.bar \{\s*will-change: auto;/
    );
    assert.match(
        equalizerSource,
        /const nextSuppressed = useMobileFrameRate && shouldSuppress;/
    );
    assert.match(
        equalizerSource.match(/const prepareIntro = \(\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /setIntroReflectionSuppression\(true\)/
    );
});

test("intro scale writes skip reflections while they are suppressed", () => {
    assert.match(
        equalizerSource,
        /const setReflectionScale = \(index, value\) => \{\s*if \(!introReflectionsSuppressed\)/
    );
    assert.match(
        equalizerSource.match(/const setIntroBarScale = \(index, height\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /setReflectionScale\(index, value\)/
    );
    assert.match(
        equalizerSource.match(/const setIntroRestScale = \(index\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /setReflectionScale\(index, value\)/
    );
});

test("live and non-intro modes restore synchronized reflections", () => {
    const suppressionRule = equalizerSource.match(
        /const setIntroReflectionSuppression = \(shouldSuppress\) => \{[\s\S]*?\n    \};/
    )?.[0] ?? "";
    assert.match(suppressionRule, /reflections\.forEach/);
    assert.match(suppressionRule, /currentHeights\[index\]/);
    assert.match(
        equalizerSource.match(/const startLive = \(initialImpulse = 0\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /setIntroReflectionSuppression\(false\)/
    );
    assert.match(
        equalizerSource.match(/const showLive = \(\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /setIntroReflectionSuppression\(false\)/
    );
});
