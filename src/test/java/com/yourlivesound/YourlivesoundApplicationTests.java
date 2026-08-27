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
        assertTrue(javascript.contains("const titleRevealDuration = 260"));
        assertTrue(javascript.contains("const floorContactDelay = 480"));
        assertTrue(javascript.contains("const seenThreshold = 10000"));
        assertTrue(javascript.contains("document.fonts?.ready"));
        assertTrue(javascript.contains("portrait.loading = \"eager\""));
        assertTrue(javascript.contains("if (!document.hidden)"));
        assertTrue(javascript.contains("queryMode === \"replay\""));
        assertTrue(javascript.contains("queryMode === \"skip\""));
        assertTrue(javascript.contains("lightSweepDuration: 2100"));
        assertTrue(javascript.contains("aimStart: 3600"));
        assertTrue(javascript.contains("equalizerLive: 6600"));
        assertTrue(javascript.contains("const sourceProgressFor = (index) =>"));
        assertTrue(javascript.contains("const aimAt = timings.aimStart + index * lightStagger"));
        assertFalse(javascript.contains("const aimSlotFor = (index) =>"));
        assertFalse(javascript.contains("const titleAimStagger ="));
        assertTrue(javascript.contains("const angle = -Math.atan2(deltaX, deltaY)"));
        assertTrue(javascript.contains("Math.hypot(deltaX, deltaY)"));
        assertTrue(javascript.contains("--intro-backlight-distance"));
        assertTrue(javascript.contains("--floor-start-offset-x"));
        assertTrue(javascript.contains("--floor-start-offset-y"));
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
        assertFalse(stylesheet.contains("calc(var(--intro-backlight-distance) - 50%)"));
        assertTrue(stylesheet.contains("calc(-50% + 0.45rem)"));
        assertTrue(stylesheet.contains(".stage-floor-spot.is-floor-tracking"));
        assertTrue(stylesheet.contains("--floor-tracking-duration"));
        assertTrue(stylesheet.contains("scale3d(1, 0.72, 1)"));
        assertTrue(stylesheet.contains("translate3d(0, 100px, 0)"));
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
        int titlePosition = html.indexOf("id=\"site-title\"");
        int carouselPosition = html.indexOf("data-quote-carousel");
        int navigationPosition = html.indexOf("class=\"site-navigation\"");
        assertTrue(titlePosition >= 0 && titlePosition < carouselPosition);
        assertTrue(carouselPosition < navigationPosition);
        assertTrue(stylesheet.contains("margin: -160px auto 0"));
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
