package com.yourlivesound;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.contact.form-action=https://formsubmit.co/test-recipient",
        "app.asset-version=test-build"
})
@AutoConfigureMockMvc
class YourlivesoundApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    void publicPagesRenderWithoutUnresolvedMessages() throws Exception {
        String[] paths = {"/", "/about", "/contacts", "/price", "/registration"};

        for (String path : paths) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(content().string(not(containsString("??"))));
        }
    }

    @Test
    void pagesHaveDistinctTitles() throws Exception {
        mockMvc.perform(get("/about"))
                .andExpect(content().string(containsString("<title>About | Your Live Sound</title>")));
        mockMvc.perform(get("/contacts"))
                .andExpect(content().string(containsString("<title>Contact | Your Live Sound</title>")));
        mockMvc.perform(get("/price"))
                .andExpect(content().string(containsString("<title>Pricing | Your Live Sound</title>")));
        mockMvc.perform(get("/registration"))
                .andExpect(content().string(containsString("<title>Project Request | Your Live Sound</title>")));
    }

    @Test
    void responsesContainSiteScopedSecurityHeaders() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")))
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    void contactFormUsesExternalConfigurationAndKeepsCaptchaEnabled() throws Exception {
        mockMvc.perform(get("/contacts"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("action=\"https://formsubmit.co/test-recipient\"")))
                .andExpect(content().string(containsString("name=\"_honey\"")))
                .andExpect(content().string(not(containsString("name=\"_captcha\""))));
    }

    @Test
    void staticAssetsUseDeploymentVersion() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/css/styles-wrap.css?v=test-build")))
                .andExpect(content().string(containsString("/css/artist-carousel.css?v=test-build")))
                .andExpect(content().string(containsString("/css/stage-intro.css?v=test-build")))
                .andExpect(content().string(containsString("/js/stage-intro.js?v=test-build")))
                .andExpect(content().string(containsString("/js/eq_main.js?v=test-build")));
    }

    @Test
    void homePageWiresStageIntroBeforeItsMotionControllers() throws Exception {
        String html = mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertTrue(html.contains("class=\"home-page stage-intro-pending\""));
        assertTrue(html.contains("data-stage-scene=\"preload\""));
        int introPosition = html.indexOf("/js/stage-intro.js?v=test-build");
        int equalizerPosition = html.indexOf("/js/eq_main.js?v=test-build");
        int carouselPosition = html.indexOf("/js/artist-carousel.js?v=test-build");
        assertTrue(introPosition >= 0 && introPosition < equalizerPosition);
        assertTrue(equalizerPosition < carouselPosition);
    }

    @Test
    void stageIntroKeepsAVisibleTimeBacklightTimelineAndVersionedSeenMarker() throws Exception {
        String javascript = mockMvc.perform(get("/js/stage-intro.js"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String stylesheet = mockMvc.perform(get("/css/stage-intro.css"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String carouselJavascript = mockMvc.perform(get("/js/artist-carousel.js"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertTrue(javascript.contains("yls.stage-intro.v3.seen"));
        assertTrue(javascript.contains("const lightStagger = 150"));
        assertFalse(javascript.contains("equalizerWaveThreshold"));
        assertTrue(javascript.contains("const sourceCollapseRatio = 0.3"));
        assertTrue(javascript.contains("const sourceTurnPathRatio = 0.18"));
        assertFalse(javascript.contains("rigLive: 7200"));
        assertTrue(javascript.contains("const screenSweepRatio = 0.52"));
        assertTrue(javascript.contains("const seenThreshold = 10000"));
        assertTrue(javascript.contains("const readinessDeadline = 2500"));
        assertTrue(javascript.contains("document.fonts?.ready"));
        assertFalse(javascript.contains("waitForPortraits"));
        assertFalse(javascript.contains("portrait.loading = \"eager\""));
        assertTrue(javascript.contains("observeReadiness(\"window-load\", waitForWindowLoad())"));
        assertTrue(javascript.contains("observeReadiness(\"fonts\", document.fonts?.ready ?? Promise.resolve())"));
        assertTrue(javascript.contains("() => startScene(\"deadline\")"));
        assertTrue(javascript.contains("body.dataset.stageIntroStartReason = reason"));
        assertTrue(javascript.contains("window.performance?.mark?.(`yls-stage-intro:${eventName}`)"));
        assertTrue(javascript.contains("if (!document.hidden)"));
        assertTrue(javascript.contains("queryMode === \"replay\""));
        assertTrue(javascript.contains("queryMode === \"skip\""));
        assertFalse(javascript.contains("lightSweepDuration"));
        assertTrue(javascript.contains("aimStart: 1000"));
        assertTrue(javascript.contains("aimTransitionDuration: 1200"));
        assertFalse(javascript.contains("equalizerLive: 7100"));
        assertTrue(javascript.contains("const lightCascadeDuration = Math.max(0, stageLights.length - 1) * lightStagger"));
        assertTrue(javascript.contains("const finalTitleRevealAt = timings.aimStart"));
        assertTrue(javascript.contains("+ lightCascadeDuration"));
        assertTrue(javascript.contains("lightCascadeDuration,"));
        assertTrue(javascript.contains("const equalizerWaveStartAt = timings.lightStart;"));
        assertTrue(javascript.contains("buttonsStart: 5200"));
        assertTrue(javascript.contains("buttonsReady: 6250"));
        assertTrue(javascript.contains("carouselStart: 6700"));
        assertTrue(javascript.contains("carouselReady: 7580"));
        assertTrue(javascript.contains("sceneComplete: 10000"));
        assertTrue(javascript.contains("const movingHeads = Array.from(document.querySelectorAll(\".moving-head\"))"));
        assertTrue(javascript.contains("addEvent(timings.lightStart, () => body.classList.add(\"stage-rig-live\"))"));
        assertTrue(javascript.contains("const movingHeadProgress = (index + 0.5)"));
        assertTrue(javascript.contains("() => head.classList.add(\"is-intro-live\")"));
        assertFalse(javascript.contains("equalizerApi?.revealBar"));
        assertTrue(javascript.contains("equalizerWaveStartAt + (equalizerApi?.introWaveDuration ?? 0)"));
        assertTrue(javascript.contains("addEvent(equalizerWaveStartAt, () => equalizerApi?.startIntroWave())"));
        assertTrue(javascript.contains("addEvent(equalizerLiveAt, () => {"));
        assertTrue(javascript.contains("equalizerApi?.startLive();"));
        assertTrue(javascript.contains("const floorSpotScaleMultiplier = 2"));
        assertTrue(javascript.contains("const floorSpotOpacityMultiplier = 0.5"));
        assertTrue(javascript.contains("const floorScaleX = floorSpotScaleMultiplier * lerp("));
        assertTrue(javascript.contains("const floorScaleY = floorSpotScaleMultiplier * lerp("));
        assertTrue(javascript.contains("* floorSpotOpacityMultiplier"));
        assertTrue(javascript.contains("const sourceProgressFor = (index) =>"));
        assertTrue(javascript.contains("const aimAt = timings.aimStart + index * lightStagger"));
        assertFalse(javascript.contains("const aimSlotFor = (index) =>"));
        assertFalse(javascript.contains("const titleAimStagger ="));
        assertTrue(javascript.contains("angle: -Math.atan2(deltaX, deltaY)"));
        assertTrue(javascript.contains("Math.hypot(deltaX, deltaY)"));
        assertTrue(javascript.contains("const quadraticPoint ="));
        assertTrue(javascript.contains("const applyStageLightMotion ="));
        assertTrue(javascript.contains("const updateStageLightMotion ="));
        assertTrue(javascript.contains("progress >= sourceCollapseRatio && progress < screenSweepRatio"));
        assertTrue(javascript.contains("progress >= 1 && lightMotionComplete[index]"));
        assertTrue(javascript.contains("--intro-beam-max-distance"));
        assertTrue(javascript.contains("--intro-beam-max-width"));
        assertTrue(javascript.contains("maximumVector * 0.11, 52, 122"));
        assertTrue(javascript.contains("--beam-length-scale"));
        assertTrue(javascript.contains("beamOpacity = 0.52 * beamRevealProgress"));
        assertTrue(javascript.contains("beamOpacity = lerp(0.52, 0.8, easeOut(screenProgress))"));
        assertTrue(javascript.contains("beamOpacity = lerp(0.8, 0.68, easedFloorProgress)"));
        assertTrue(javascript.contains("--source-glare-shift-x"));
        assertTrue(javascript.contains("--source-glare-shift-y"));
        assertTrue(javascript.contains("const edgeInfluence = easeInOut"));
        assertTrue(javascript.contains("const edgeExitX = source.x"));
        assertTrue(javascript.contains("x: lerp(centralPathX, edgeExitX, edgeInfluence)"));
        assertTrue(javascript.contains("let sourceGlareShiftX = 0"));
        assertTrue(javascript.contains("const sourceGlareScaleFor = (index) =>"));
        assertTrue(javascript.contains("lightNumber < 4 || lightNumber > 12"));
        assertTrue(javascript.contains("lightNumber <= 7 ? lightNumber - 2 : 13 - lightNumber"));
        assertTrue(javascript.contains("const sourceGlareSize = sourceGlareScaleFor(index)"));
        assertTrue(javascript.contains("sourceGlareOpacity = 0.94 * (1 - collapseProgress)"));
        assertTrue(javascript.contains("sourceGlareSize * 0.72"));
        assertTrue(javascript.contains("sourceGlareShiftY = geometry.sourceGlareRadius"));
        assertTrue(javascript.contains("* sourceGlareScale"));
        assertTrue(javascript.contains("const sourceGlareDiameter = Number.parseFloat"));
        assertTrue(javascript.contains("window.getComputedStyle(light, \"::before\").width"));
        assertTrue(javascript.contains("sourceGlareRadius"));
        assertTrue(javascript.contains("const beamRevealProgress = easeOut"));
        assertTrue(javascript.contains("const floorPlaneProgress = clamp"));
        assertTrue(javascript.contains("geometry.stageBoundaryY - beamPoint.y"));
        assertTrue(javascript.contains("y: stageBoundaryY"));
        assertTrue(javascript.contains("floorSpotOpacity = easeOut(floorPlaneProgress)"));
        assertTrue(javascript.contains("const floorSpotWidth = Number.parseFloat"));
        assertTrue(javascript.contains("const targetSpotWidth = clamp"));
        assertTrue(javascript.contains("floorTargetScaleX"));
        assertFalse(javascript.contains("stage-screen-glare"));
        assertTrue(javascript.contains("const appliedLightAngle = lightAngle ?? lightVector.angle"));
        assertTrue(javascript.contains("screenExit"));
        assertTrue(javascript.contains("floorStart"));
        assertFalse(javascript.contains("--floor-start-offset-x"));
        assertFalse(javascript.contains("--floor-start-offset-y"));
        assertTrue(javascript.contains("is-floor-tracking"));
        assertTrue(javascript.contains("is-floor-settled"));
        assertTrue(javascript.contains("revealTitleTarget(index)"));
        assertTrue(javascript.contains("window.addEventListener(\"resize\", scheduleStageLightTargetSync"));
        assertTrue(javascript.contains("stageTargetResizeObserver = new ResizeObserver"));
        assertTrue(javascript.contains("stageTargetResizeObserver.observe(stageRig)"));
        assertTrue(javascript.contains("stageTargetResizeObserver.observe(title)"));
        assertTrue(
                javascript.indexOf("stageTargetResizeObserver = new ResizeObserver")
                        < javascript.indexOf("if (!shouldPlay)"),
                "Resize tracking must also be active for the already-seen and skip states");
        assertTrue(javascript.contains("equalizerApi?.startLive()"));
        assertFalse(javascript.contains("equalizerApi?.pulse("));
        assertTrue(javascript.contains("carouselApi?.beginReveal()"));
        assertFalse(javascript.contains("document.cookie"));

        assertFalse(stylesheet.contains("stage-title-arrival"));
        assertTrue(stylesheet.contains("stage-title-backlit"));
        assertTrue(stylesheet.contains(".title-character.is-revealed"));
        assertTrue(stylesheet.contains("color: #f4fbff"));
        assertTrue(stylesheet.contains("color: #ff5365"));
        assertTrue(stylesheet.contains(".home-page .title .title-character"));
        assertTrue(stylesheet.contains("#142a34 100%"));
        assertTrue(stylesheet.contains("#35080f 100%"));
        assertTrue(stylesheet.contains("-webkit-background-clip: text"));
        assertTrue(stylesheet.contains("-webkit-text-fill-color: transparent"));
        assertFalse(stylesheet.contains(".stage-screen-glare"));
        assertTrue(stylesheet.contains("width: clamp(1.125rem, 4.25vw, 3.25rem)"));
        assertTrue(stylesheet.contains("height: clamp(1.125rem, 4.25vw, 3.25rem)"));
        assertTrue(stylesheet.contains("--intro-beam-max-width: clamp(3.6rem, 9vw, 8.2rem)"));
        assertTrue(stylesheet.contains("rgba(248, 254, 255, 0.96) 0 0.16rem"));
        assertTrue(stylesheet.contains("rgba(248, 254, 255, 0.98) 0 0.18rem"));
        assertTrue(stylesheet.contains("rgba(255, 255, 255, 0.92) 8%"));
        assertTrue(stylesheet.contains("rgba(181, 219, 233, 0.022) 58%"));
        assertTrue(stylesheet.contains("transparent 82%"));
        assertTrue(stylesheet.contains("polygon(42% 0, 58% 0, 98% 100%, 2% 100%)"));
        assertTrue(stylesheet.contains("background-size: 100% 1.25rem"));
        assertFalse(stylesheet.contains("filter: blur(clamp(4px, 0.65vw, 9px))"));
        assertTrue(stylesheet.contains("scale3d(var(--beam-length-scale), var(--beam-length-scale), 1)"));
        assertTrue(stylesheet.contains("translate3d(-200vw, -200vh, 0)"));
        assertTrue(stylesheet.contains("--stage-floor-boundary-y"));
        assertTrue(stylesheet.contains("inset: 0 0 auto 0"));
        assertTrue(stylesheet.contains("height: var(--stage-floor-boundary-y)"));
        assertTrue(stylesheet.contains(".stage-floor-spot.is-floor-tracking"));
        assertFalse(stylesheet.contains("--floor-tracking-duration"));
        assertFalse(stylesheet.contains("translate3d(0, 100px, 0)"));
        assertTrue(stylesheet.contains("translate3d(0, 50px, 0)"));
        assertFalse(stylesheet.contains("translate3d(0, 44px, 0)"));
        assertTrue(stylesheet.contains("translate3d(0, 22px, 0)"));
        assertTrue(stylesheet.contains(".moving-head:not(.is-intro-live)"));
        assertTrue(stylesheet.contains("animation-delay: 450ms"));
        assertTrue(stylesheet.contains("stage-carousel-arrival 880ms"));

        assertTrue(carouselJavascript.contains("let introHeld = Boolean(stageIntro?.shouldPlay)"));
        assertTrue(carouselJavascript.contains("|| introHeld"));
        assertTrue(carouselJavascript.contains("stageIntro.registerCarousel"));
        assertTrue(carouselJavascript.contains("const finishReveal = () =>"));
    }

    @Test
    void homePageRendersCuratedArtistCarouselBetweenLogoAndNavigation() throws Exception {
        String html = mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/js/artist-carousel.js?v=test-build")))
                .andExpect(content().string(containsString("Michael Jackson")))
                .andExpect(content().string(containsString("Sade Adu")))
                .andExpect(content().string(containsString("Quincy Jones")))
                .andExpect(content().string(containsString("Gary Moore")))
                .andExpect(content().string(containsString("B.B. King")))
                .andExpect(content().string(containsString("Al Jarreau")))
                .andExpect(content().string(containsString("Stevie Wonder")))
                .andExpect(content().string(containsString("Bruce Swedien")))
                .andExpect(content().string(not(containsString("Music and rhythm find their way"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String stylesheet = mockMvc.perform(get("/css/artist-carousel.css"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(8, html.split("data-carousel-slide", -1).length - 1);
        assertEquals(1, html.split("loading=\"eager\"", -1).length - 1);
        assertEquals(7, html.split("loading=\"lazy\"", -1).length - 1);
        int titlePosition = html.indexOf("id=\"site-title\"");
        int carouselPosition = html.indexOf("data-quote-carousel");
        int navigationPosition = html.indexOf("class=\"site-navigation\"");
        assertTrue(titlePosition >= 0 && titlePosition < carouselPosition);
        assertTrue(carouselPosition < navigationPosition);
        assertTrue(stylesheet.contains("margin: max(-160px, calc(-20px - 20svh)) auto 0"));
    }

    @Test
    void aboutPageDoesNotRenderArtistCarousel() throws Exception {
        mockMvc.perform(get("/about"))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("data-quote-carousel"))))
                .andExpect(content().string(not(containsString("artist-carousel.css"))))
                .andExpect(content().string(not(containsString("artist-carousel.js"))))
                .andExpect(content().string(not(containsString("Michael Jackson"))));
    }

    @Test
    void equalizerRendersCompleteBackgroundStageRig() throws Exception {
        String html = mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(15, html.split("class=\"stage-light\"", -1).length - 1);
        assertEquals(0, html.split("class=\"stage-screen-glare\"", -1).length - 1);
        assertEquals(15, html.split("class=\"stage-floor-spot\"", -1).length - 1);
        assertEquals(14, html.split("class=\"moving-head\"", -1).length - 1);
        assertEquals(72, html.split("class=\"stage-strobe\"", -1).length - 1);
        assertEquals(15, html.split("data-title-target", -1).length - 1);
        assertEquals(15, html.split("data-reflection-target", -1).length - 1);
        assertEquals(1, html.split("class=\"stage-front-boundary\"", -1).length - 1);
    }

    @Test
    void equalizerUsesTransformScalingAndKeepsIndependentMotionProfiles() throws Exception {
        String javascript = mockMvc.perform(get("/js/eq_main.js"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String stylesheet = mockMvc.perform(get("/css/eq_main.css"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertTrue(javascript.contains("const setBarScale = (index, height) =>"));
        assertTrue(javascript.contains("bars[index].style.transform = value"));
        assertTrue(javascript.contains("reflections[index].style.transform = value"));
        assertFalse(javascript.contains(".style.height ="));
        assertTrue(javascript.contains("phase: Math.random()"));
        assertTrue(javascript.contains("detailPhase: Math.random()"));
        assertTrue(javascript.contains("speed: 3.2 + Math.random() * 1.6"));
        assertTrue(stylesheet.contains("--perspective-arc-height: 9.5%"));
        assertTrue(stylesheet.contains("--equalizer-bar-height: 29%"));
        assertTrue(stylesheet.contains("width: min(88%, 1160px)"));
        assertTrue(stylesheet.contains("height: 43%"));
        assertTrue(stylesheet.contains("top: 8.5%"));
        assertTrue(stylesheet.contains("font-size: clamp(1.85rem, 7.8vw, 6.43rem)"));
        assertTrue(stylesheet.contains(".stage-front-boundary"));
        assertTrue(stylesheet.contains("top: 64.5%"));
        assertTrue(stylesheet.contains("visibility: hidden"));
        assertFalse(stylesheet.contains("background: #ffd34f"));
        for (String midpoint : new String[]{
                "7.286%", "13.857%", "20.429%", "27%", "33.571%", "40.143%", "46.714%",
                "53.286%", "59.857%", "66.429%", "73%", "79.571%", "86.143%", "92.714%"
        }) {
            assertTrue(stylesheet.contains("--head-x: " + midpoint));
        }
        assertTrue(javascript.contains("targetLevel > profile.level ? attackResponse : releaseResponse"));
        assertTrue(javascript.contains("const introRestPixels = 2"));
        assertTrue(javascript.contains("const setIntroRestScale = (index) =>"));
        assertTrue(javascript.contains("introRestPixels / holderHeight"));
        assertTrue(javascript.contains("holder.classList.add(\"is-intro-rest\")"));
        assertTrue(javascript.contains("const prepareIntro = () =>"));
        assertTrue(javascript.contains("const revealBar = (index) =>"));
        assertTrue(javascript.contains("const pulse = (strength) =>"));
        assertTrue(javascript.contains("const introWavePeakHeight = maximumHeight * 0.3"));
        assertTrue(javascript.contains("const introWaveSweepDuration = stageIntro?.lightCascadeDuration ?? 2100"));
        assertTrue(javascript.contains("const introWaveBarStagger = introWaveSweepDuration / Math.max(1, barCount - 1)"));
        assertTrue(javascript.contains("const introWaveRiseDuration = introWaveBarStagger * 3"));
        assertTrue(javascript.contains("const introWaveFallDuration = introWaveRiseDuration * 4"));
        assertTrue(javascript.contains("const introWaveBarDuration = introWaveRiseDuration + introWaveFallDuration"));
        assertTrue(javascript.contains("const introWaveDuration = (barCount - 1) * introWaveBarStagger"));
        assertTrue(javascript.contains("const renderIntroWave = (timestamp) =>"));
        assertTrue(javascript.contains("const localElapsed = introWaveElapsed - index * introWaveBarStagger"));
        assertTrue(javascript.contains("const waveComplete = localElapsed >= introWaveBarDuration"));
        assertTrue(javascript.contains("revealBar(index)"));
        assertTrue(javascript.contains("classList.toggle(\"is-intro-rest\", waveComplete)"));
        assertTrue(javascript.contains("localElapsed <= introWaveRiseDuration"));
        assertTrue(javascript.contains("(localElapsed - introWaveRiseDuration) / introWaveFallDuration"));
        assertTrue(javascript.contains("const lift = Math.sin(Math.PI * progress)"));
        assertTrue(javascript.contains("const startIntroWave = () =>"));
        assertTrue(javascript.contains("introWaveRestHeights = currentHeights.slice()"));
        assertTrue(javascript.contains("volumeContainer.dataset.equalizerPhase = \"intro-wave\""));
        assertTrue(javascript.contains("introWaveDuration,"));
        assertTrue(javascript.contains("startIntroWave,"));
        assertTrue(javascript.contains("const startLive = (initialImpulse = 0) =>"));
        assertTrue(javascript.contains("stageIntro.registerEqualizer"));

        assertTrue(stylesheet.contains("transform: translateZ(0) scaleY(0.14)"));
        assertTrue(stylesheet.contains("transform-origin: 50% 100%"));
        assertTrue(stylesheet.contains("transform-origin: 50% 0"));
        assertTrue(stylesheet.contains("will-change: transform"));
        assertFalse(stylesheet.contains("will-change: height"));
    }

    @Test
    void healthAndCrawlerFilesAreAvailable() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Sitemap: https://yourlivesound.com/sitemap.xml")));
        mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("https://yourlivesound.com/about")));
    }

    @Test
    void obsoleteFragmentRouteIsNotPublic() throws Exception {
        mockMvc.perform(get("/form_1"))
                .andExpect(status().isNotFound());
    }
}
