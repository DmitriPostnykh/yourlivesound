package com.yourlivesound.controller;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import javax.mail.MessagingException;

@Controller
public class MessagesController {

    @Autowired
    private JavaMailSender mailSender;

    @PostMapping("/sendMail")
    public String sendMail(
            @RequestParam("name") String name,
            @RequestParam("email") String email,
            @RequestParam("phone") String phone,
            @RequestParam("message") String message
    ) throws MessagingException, jakarta.mail.MessagingException {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");

        String mailContent = "<p><b>Name:</b> " + name + "</p>";
        mailContent += "<p><b>Email:</b> " + email + "</p>";
        mailContent += "<p><b>Phone:</b> " + phone + "</p>";
        mailContent += "<p><b>Message:</b> " + message + "</p>";

        helper.setTo("javadeveloper7377@gmail.com");
        helper.setSubject("New message from contact form");
        helper.setText(mailContent, true); // true indicates HTML

        mailSender.send(mimeMessage);

        return "/"; // редирект на страницу успеха
    }
}
