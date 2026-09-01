import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
    new URL("../../main/resources/static/css/eq_main.css", import.meta.url),
    "utf8"
);

const mobileColorRule = stylesheet.match(
    /@media \(any-pointer: coarse\), \(max-width: 820px\) \{[\s\S]*?\.stage-lights \.moving-head \{[\s\S]*?\n    \}[\s\S]*?\n\}/
)?.[0] ?? "";

test("mobile moving heads use a rare discrete color cycle", () => {
    assert.notEqual(mobileColorRule, "");
    assert.match(mobileColorRule, /--head-color-duration: 36s/);
    assert.match(mobileColorRule, /steps\(1, end\)/);
});

test("mobile color optimization keeps movement layers and releases the filter layer", () => {
    assert.match(mobileColorRule, /will-change: opacity, transform/);
    assert.doesNotMatch(mobileColorRule, /will-change:[^;]*filter/);
});

test("desktop color animation and beam blur remain available", () => {
    assert.match(stylesheet, /stage-head-color var\(--head-color-duration\) linear infinite/);
    assert.match(stylesheet, /will-change: filter, opacity, transform/);
    assert.match(stylesheet, /filter: blur\(clamp\(2px, 0\.3vw, 4px\)\)/);
});
