package com.yourlivesound.controller;

import com.yourlivesound.service.QuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.HttpServletRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
public class HomeController {

    @Autowired
    private QuoteService quoteService;

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("currentURI", "/");
        model.addAttribute("buttons", getMenuButtons("/"));
        return "index";
    }

    @GetMapping("/about")
    public String getQuote(Model model) {
        String quote = quoteService.getRandomQuote();
        model.addAttribute("quote", quote);
        model.addAttribute("currentURI", "/about");
        model.addAttribute("buttons", getMenuButtons("/about"));
        return "about";
    }

    @GetMapping("/contacts")
    public String contacts(Model model) {
        model.addAttribute("currentURI", "/contacts");
        model.addAttribute("buttons", getMenuButtons("/contacts"));
        return "contacts";
    }

    @GetMapping("/price")
    public String price(Model model) {
        model.addAttribute("currentURI", "/price");
        model.addAttribute("buttons", getMenuButtons("/price"));
        return "price";
    }

    @GetMapping("/registration")
    public String registration(Model model) {
        model.addAttribute("currentURI", "/registration");
        model.addAttribute("buttons", getMenuButtons("/registration"));
        return "registration";
    }


    @GetMapping("/form_1")
    public String form_1(Model model) {
        model.addAttribute("currentURI", "/form_1");
        model.addAttribute("buttons", getMenuButtons("/form_1"));
        return "fragments/form_1";
    }

    private List<Map<String, String>> getMenuButtons(String currentURI) {
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
}