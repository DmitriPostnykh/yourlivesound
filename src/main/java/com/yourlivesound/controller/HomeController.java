package com.yourlivesound.controller;


import com.yourlivesound.service.QuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {
    @Autowired
    private QuoteService quoteService;
    @GetMapping("/")
    public String home() {
        return "index";
    }
    @GetMapping("/about")
    public String getQuote(Model model) {
        String quote = quoteService.getRandomQuote();
        model.addAttribute("quote", quote);
        return "about"; // имя вашего шаблона
    }
    @GetMapping("/login")
    public String login() {
        return "login";
    }
    @GetMapping("/registration")
    public String registration() {
        return "registration";
    }
    @GetMapping("/testimonials")
    public String testimonials() {
        return "testimonials";
    }
    @GetMapping("/thank-you")
    public String thank_you() {
        return "thank-you";
    }
    @GetMapping("/form_1")
    public String form_1() {
        return "fragments/form_1";
    }

}
