package com.yourlivesound.controller;

import com.yourlivesound.service.QuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.HttpServletRequest;

@Controller
public class HomeController {

    @Autowired
    private QuoteService quoteService;

    @GetMapping("/")
    public String home(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/");
        return "index";
    }

    @GetMapping("/about")
    public String getQuote(Model model, HttpServletRequest request) {
        String quote = quoteService.getRandomQuote();
        model.addAttribute("quote", quote);
        model.addAttribute("currentURI", "/about");
        return "about";
    }

    @GetMapping("/contacts")
        public String contacts(Model model, HttpServletRequest request){
        model.addAttribute("currentURI", "/contacts");
        return "contacts";
    }
    @GetMapping("/login")
    public String login(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/login");
        return "login";
    }

    @GetMapping("/registration")
    public String registration(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/registration");
        return "registration";
    }

    @GetMapping("/testimonials")
    public String testimonials(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/testimonials");
        return "testimonials";
    }

    @GetMapping("/thank-you")
    public String thank_you(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/thank-you");
        return "thank-you";
    }

    @GetMapping("/form_1")
    public String form_1(Model model, HttpServletRequest request) {
        model.addAttribute("currentURI", "/form_1");
        return "fragments/form_1";
    }
}