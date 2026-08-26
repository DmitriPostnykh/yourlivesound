package com.yourlivesound.model;

public record ArtistQuote(
        String artist,
        String role,
        String quote,
        String portraitPath,
        String portraitAlt,
        String quoteSourceUrl,
        String photoCredit,
        String photoSourceUrl
) {
}
