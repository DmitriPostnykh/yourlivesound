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
                .andExpect(content().string(containsString("/js/eq_main.js?v=test-build")));
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

        assertEquals(8, html.split("data-carousel-slide", -1).length - 1);
        int titlePosition = html.indexOf("id=\"site-title\"");
        int carouselPosition = html.indexOf("data-quote-carousel");
        int navigationPosition = html.indexOf("class=\"site-navigation\"");
        assertTrue(titlePosition >= 0 && titlePosition < carouselPosition);
        assertTrue(carouselPosition < navigationPosition);
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

        assertEquals(12, html.split("class=\"stage-light\"", -1).length - 1);
        assertEquals(11, html.split("class=\"moving-head\"", -1).length - 1);
        assertEquals(72, html.split("class=\"stage-strobe\"", -1).length - 1);
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
        assertTrue(javascript.contains("targetLevel > profile.level ? attackResponse : releaseResponse"));

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
