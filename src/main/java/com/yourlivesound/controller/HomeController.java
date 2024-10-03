package com.yourlivesound.controller;


import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {
    @GetMapping("/")
    public String home() {
        return "index";
    }
    @GetMapping("/about")
    public String about() {
        return "about";
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
