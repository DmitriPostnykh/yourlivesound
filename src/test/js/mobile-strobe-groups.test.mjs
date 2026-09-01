import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
    new URL("../../main/resources/static/css/eq_main.css", import.meta.url),
    "utf8"
);

const mobilePerformanceRule = stylesheet.match(
    /@media \(any-pointer: coarse\), \(max-width: 820px\) \{[\s\S]*?\n\}/
)?.[0] ?? "";

test("mobile stage uses 24 grouped strobe positions", () => {
    assert.notEqual(mobilePerformanceRule, "");
    assert.match(
        mobilePerformanceRule,
        /grid-template-columns: repeat\(24, minmax\(0, 1fr\)\)/
    );
    assert.match(
        mobilePerformanceRule,
        /\.stage-strobe:not\(:nth-child\(3n \+ 2\)\)/
    );
    assert.match(mobilePerformanceRule, /display: none/);
    assert.match(mobilePerformanceRule, /animation: none/);
});

test("desktop keeps the original 72-position strobe line", () => {
    assert.match(
        stylesheet,
        /grid-template-columns: repeat\(72, minmax\(0, 1fr\)\)/
    );
    assert.match(
        stylesheet,
        /animation: stage-strobe-flash var\(--strobe-duration\) linear infinite/
    );
});
