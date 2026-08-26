package com.yourlivesound.controller;

import com.yourlivesound.service.QuoteService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    private final QuoteService quoteService;

    public HomeController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("artistQuotes", quoteService.getFeaturedQuotes());
        return "about";
    }

    @GetMapping("/contacts")
    public String contacts() {
        return "contacts";
    }

    @GetMapping("/price")
    public String price() {
        return "price";
    }

    @GetMapping("/registration")
    public String registration() {
        return "registration";
    }
}
