package com.yourlivesound.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.net.URI;
import java.time.Year;
import java.util.List;
import java.util.Map;

@ControllerAdvice
public class SiteModelAdvice {

    private static final List<Map<String, String>> NAVIGATION = List.of(
            Map.of("label", "Home", "uri", "/"),
            Map.of("label", "About", "uri", "/about"),
            Map.of("label", "Contact", "uri", "/contacts"),
            Map.of("label", "Pricing", "uri", "/price"),
            Map.of("label", "Project Request", "uri", "/registration")
    );

    private final String contactFormAction;
    private final String assetVersion;

    public SiteModelAdvice(
            @Value("${app.contact.form-action:}") String contactFormAction,
            @Value("${app.asset-version:dev}") String assetVersion
    ) {
        this.contactFormAction = validateContactFormAction(contactFormAction);
        this.assetVersion = validateAssetVersion(assetVersion);
    }

    @ModelAttribute("buttons")
    public List<Map<String, String>> navigation(HttpServletRequest request) {
        String currentPath = request.getRequestURI();
        return NAVIGATION.stream()
                .filter(item -> !item.get("uri").equals(currentPath))
                .toList();
    }

    @ModelAttribute("currentYear")
    public int currentYear() {
        return Year.now().getValue();
    }

    @ModelAttribute("contactFormAction")
    public String contactFormAction() {
        return contactFormAction;
    }

    @ModelAttribute("contactFormConfigured")
    public boolean contactFormConfigured() {
        return !contactFormAction.isBlank();
    }

    @ModelAttribute("assetVersion")
    public String assetVersion() {
        return assetVersion;
    }

    private static String validateContactFormAction(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        URI uri = URI.create(value.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !"formsubmit.co".equalsIgnoreCase(uri.getHost())
                || uri.getPath() == null
                || uri.getPath().length() <= 1) {
            throw new IllegalArgumentException(
                    "app.contact.form-action must be an HTTPS FormSubmit endpoint"
            );
        }
        return uri.toASCIIString();
    }

    private static String validateAssetVersion(String value) {
        if (value == null || !value.matches("[A-Za-z0-9._-]{1,64}")) {
            throw new IllegalArgumentException(
                    "app.asset-version must contain only letters, digits, dots, underscores, or dashes"
            );
        }
        return value;
    }
}
