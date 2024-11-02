package com.yourlivesound.controller;

import com.yourlivesound.service.QuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
public abstract class BaseController {

    @Autowired
    private QuoteService quoteService;

    @ModelAttribute("buttons")
    public List<Map<String, String>> getMenuButtons(Model model) {
        String currentURI = (String) model.getAttribute("currentURI");
        List<Map<String, String>> buttons = new ArrayList<>();

        if (!"/about".equals(currentURI)) {
            buttons.add(Map.of("label", "About", "uri", "/about"));
        }
        if (!"/".equals(currentURI)) {
            buttons.add(Map.of("label", "Home", "uri", "/"));
        }
        if (!"/contacts".equals(currentURI)) {
            buttons.add(Map.of("label", "Contacts", "uri", "/contacts"));
        }
        if (!"/price".equals(currentURI)) {
            buttons.add(Map.of("label", "Price", "uri", "/price"));
        }
        if (!"/registration".equals(currentURI)) {
            buttons.add(Map.of("label", "Registration", "uri", "/registration"));
        }

        return buttons;
    }

    public void setCommonModelAttributes(Model model, String currentURI) {
        model.addAttribute("currentURI", currentURI);
    }

    public String getRandomQuote() {
        return quoteService.getRandomQuote();
    }
}
