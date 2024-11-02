package com.yourlivesound.service;

import com.yourlivesound.quote.Quote;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class QuoteService {

    private final List<Quote> quotes = new ArrayList<>();
    private final Random random = new Random();

    public QuoteService() {
        // Add your quotes to the list
        quotes.add(new Quote("Duke Ellington (musician, jazz pianist, and composer):\n" +
                "\"If it sounds good, it is good.\""));
        quotes.add(new Quote("Leonard Cohen (musician, singer, and poet):\n" +
                "\"Music is emotional mathematics.\""));
        quotes.add(new Quote("Joan Baez (musician, folk singer):\n" +
                "\"Music changed my life - and it can change yours.\""));
        quotes.add(new Quote("John Lennon (musician, member of The Beatles):\n" +
                "\"Music is art for the ears, not for the eyes.\""));
        quotes.add(new Quote("Edith Piaf (musician, singer):\n" +
                "\"Sing as if it were your last song.\""));
        quotes.add(new Quote("Bob Marley (musician, reggae singer):\n" +
                "\"One good thing about music: when it hits you, you feel no pain.\""));
        quotes.add(new Quote("Serge Gainsbourg (musician, singer, composer):\n" +
                "\"Music is the only art that goes directly to the heart.\""));
        quotes.add(new Quote("Michael Jackson (musician, singer, dancer):\n" +
                "\"Music and rhythm find their way into the secret places of the soul.\""));
        quotes.add(new Quote("Katy Perry (musician, singer):\n" +
                "\"Music is a universal language that unifies people.\""));
        quotes.add(new Quote("Ludwig van Beethoven (composer, pianist):\n" +
                "\"Music is a mediator between the spiritual and the sensual life.\""));
        quotes.add(new Quote("Ennio Morricone (composer, conductor):\n" +
                "\"Music in film is an additional character.\""));
        quotes.add(new Quote("Amy Winehouse (musician, singer):\n" +
                "\"I just want to write music that makes people feel.\""));
        quotes.add(new Quote("John Cage (composer, experimental musician):\n" +
                "\"There is no noise, only sound.\""));
        quotes.add(new Quote("Igor Stravinsky (composer):\n" +
                "\"My freedom will be where I create my own limitations.\""));
        quotes.add(new Quote("Frank Zappa (musician, composer):\n" +
                "\"Without deviations from the norm, progress would not be possible.\""));
        // ... add the remaining quotes
    }

    public String getRandomQuote() {
        int index = random.nextInt(quotes.size());
        return quotes.get(index).getText();
    }
}