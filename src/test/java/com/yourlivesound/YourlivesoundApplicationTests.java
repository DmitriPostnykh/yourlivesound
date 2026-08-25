package com.yourlivesound;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
                .andExpect(content().string(containsString("/js/eq_main.js?v=test-build")));
    }

    @Test
    void equalizerRendersCompleteBackgroundStageRig() throws Exception {
        String html = mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(12, html.split("class=\"stage-light\"", -1).length - 1);
        assertEquals(6, html.split("class=\"moving-head\"", -1).length - 1);
        assertEquals(18, html.split("class=\"stage-strobe\"", -1).length - 1);
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
