import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const introSource = await readFile(
    new URL("../../main/resources/static/js/stage-intro.js", import.meta.url),
    "utf8"
);
const introStylesheet = await readFile(
    new URL("../../main/resources/static/css/stage-intro.css", import.meta.url),
    "utf8"
);

test("individual floor spots crossfade only after the final title target", () => {
    assert.match(introSource, /const floorSpotConsolidationDuration = 260/);
    assert.match(
        introSource,
        /addEvent\(finalTitleRevealAt, \(\) => consolidateFloorSpots\(\)\)/
    );
    assert.match(
        introSource.match(/const consolidateFloorSpots = \(immediate = false\) => \{[\s\S]*?\n    \};/)?.[0] ?? "",
        /window\.setTimeout\(\s*finishFloorSpotConsolidation,\s*floorSpotConsolidationDuration/
    );
});

test("the settled scene renders one gradient wash and releases fifteen spot layers", () => {
    assert.match(introStylesheet, /\.stage-floor-spots::after \{[\s\S]*?background: radial-gradient\(/);
    assert.match(
        introStylesheet,
        /\.stage-floor-spots\.is-floor-consolidated \.stage-floor-spot \{[\s\S]*?display: none;/
    );
    assert.match(
        introStylesheet,
        /\.stage-floor-spots\.is-floor-consolidated::after \{[\s\S]*?will-change: auto;/
    );
    assert.match(introSource, /floorSpotLayer\.dataset\.floorLightMode = "consolidated"/);
    assert.match(introSource, /consolidateFloorSpots\(true\)/);
});

test("the single wash follows the measured final floor-light geometry", () => {
    const geometrySync = introSource.match(
        /const syncFloorWashGeometry = \(\) => \{[\s\S]*?\n    \};/
    )?.[0] ?? "";

    assert.match(geometrySync, /geometry\.floorSpotWidth/);
    assert.match(geometrySync, /geometry\.floorTargetScaleX/);
    assert.match(geometrySync, /--floor-wash-x/);
    assert.match(geometrySync, /--floor-wash-y/);
    assert.match(geometrySync, /--floor-wash-width/);
    assert.match(geometrySync, /--floor-wash-height/);
});
