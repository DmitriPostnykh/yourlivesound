package com.yourlivesound.service;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class QuoteService {

    private final List<String> quotes = List.of(
        "Duke Ellington (musician, jazz pianist, and composer):\n" +
                "\"If it sounds good, it is good.\"",
        "Leonard Cohen (musician, singer, and poet):\n" +
                "\"Music is emotional mathematics.\"",
        "Joan Baez (musician, folk singer):\n" +
                "\"Music changed my life - and it can change yours.\"",
        "John Lennon (musician, member of The Beatles):\n" +
                "\"Music is art for the ears, not for the eyes.\"",
        "Edith Piaf (musician, singer):\n" +
                "\"Sing as if it were your last song.\"",
        "Bob Marley (musician, reggae singer):\n" +
                "\"One good thing about music: when it hits you, you feel no pain.\"",
        "Serge Gainsbourg (musician, singer, composer):\n" +
                "\"Music is the only art that goes directly to the heart.\"",
        "Michael Jackson (musician, singer, dancer):\n" +
                "\"Music and rhythm find their way into the secret places of the soul.\"",
        "Katy Perry (musician, singer):\n" +
                "\"Music is a universal language that unifies people.\"",
        "Ludwig van Beethoven (composer, pianist):\n" +
                "\"Music is a mediator between the spiritual and the sensual life.\"",
        "Ennio Morricone (composer, conductor):\n" +
                "\"Music in film is an additional character.\"",
        "Amy Winehouse (musician, singer):\n" +
                "\"I just want to write music that makes people feel.\"",
        "John Cage (composer, experimental musician):\n" +
                "\"There is no noise, only sound.\"",
        "Igor Stravinsky (composer):\n" +
                "\"My freedom will be where I create my own limitations.\"",
        "Frank Zappa (musician, composer):\n" +
                "\"Without deviations from the norm, progress would not be possible.\""
    );

    public String getRandomQuote() {
        return quotes.get(ThreadLocalRandom.current().nextInt(quotes.size()));
    }
}
