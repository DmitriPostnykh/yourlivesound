package com.yourlivesound.service;

import com.yourlivesound.model.ArtistQuote;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuoteService {

    private static final List<ArtistQuote> FEATURED_QUOTES = List.of(
            new ArtistQuote(
                    "Michael Jackson",
                    "Singer, songwriter & dancer",
                    "Music has been my outlet, my gift to all of the lovers in this world. " +
                            "Through it—my music—I know I will live forever.",
                    "/images/artists/michael-jackson.jpg",
                    "Michael Jackson in 1983",
                    "https://www.grammy.com/video/michael-jackson-presented-grammy-legend-award-janet-jackson/",
                    "Matthew Rolston / Epic Records · Public domain",
                    "https://commons.wikimedia.org/wiki/File:Michael_Jackson_1983_(3x4_cropped)_(contrast).jpg"
            ),
            new ArtistQuote(
                    "Sade Adu",
                    "Singer & songwriter",
                    "I only make records when I feel I have something to say.",
                    "/images/artists/sade-adu.jpg",
                    "Sade Adu performing in 2011",
                    "https://www.sade.com/biography",
                    "Thilo Parg · CC BY-SA 3.0",
                    "https://commons.wikimedia.org/wiki/File:Sade_Adu_1_(cropped).jpg"
            ),
            new ArtistQuote(
                    "Quincy Jones",
                    "Producer, composer & arranger",
                    "Let music, each genre, stay true to its soul.",
                    "/images/artists/quincy-jones.jpg",
                    "Quincy Jones in 1980",
                    "https://www.pbs.org/wnet/americanmasters/quincy-jones-the-story-of-an-american-musician/636/",
                    "Los Angeles Times · CC BY 4.0",
                    "https://commons.wikimedia.org/wiki/File:Quincy_jones_1980_(cropped).jpg"
            ),
            new ArtistQuote(
                    "Gary Moore",
                    "Guitarist & songwriter",
                    "Music is not to impress people; music has to stand up on its own.",
                    "/images/artists/gary-moore.jpg",
                    "Gary Moore performing at Pite Havsbad",
                    "https://www.musicradar.com/news/guitars/gary-moore-the-lost-interview-in-depth-with-a-guitar-legend-637450",
                    "Tibban99 · CC BY 3.0",
                    "https://commons.wikimedia.org/wiki/File:Gary-Moore-at-Pite-Havsbad.jpg"
            ),
            new ArtistQuote(
                    "B.B. King",
                    "Blues guitarist & singer",
                    "You have a soul, you have a heart, you have a feeling—and your music is life.",
                    "/images/artists/bb-king.jpg",
                    "B.B. King performing with Lucille",
                    "https://achievement.org/achiever/b-b-king/",
                    "Marco Tambara / Lightversus · CC BY-SA 3.0",
                    "https://commons.wikimedia.org/wiki/File:Bbking.jpg"
            ),
            new ArtistQuote(
                    "Al Jarreau",
                    "Jazz vocalist",
                    "You do it with all of your heart. Maybe that attracts people, the love of the craft.",
                    "/images/artists/al-jarreau.jpg",
                    "Portrait of Al Jarreau wearing a black cap",
                    "https://aljarreau.com/al-jarreau-interview-tamar-alexia-fleishman/",
                    "Kingkongphoto · CC BY-SA 2.0",
                    "https://commons.wikimedia.org/wiki/File:Al_Jarreau.jpg"
            ),
            new ArtistQuote(
                    "Stevie Wonder",
                    "Singer, songwriter & producer",
                    "So it’s all about the feeling, every time.",
                    "/images/artists/stevie-wonder.jpg",
                    "Stevie Wonder performing at British Summer Time",
                    "https://www.grammy.com/news/stevie-wonders-ascap-expo-keynote-shares-message-of-love/",
                    "Raph_PH · CC BY 2.0",
                    "https://commons.wikimedia.org/wiki/File:SWonderBSTHyde060719-72_(cropped).jpg"
            ),
            new ArtistQuote(
                    "Bruce Swedien",
                    "Recording & mixing engineer",
                    "Everything that I do in music—mixing or recording or producing—is music driven.",
                    "/images/artists/bruce-swedien.jpg",
                    "Recording and mixing engineer Bruce Swedien",
                    "https://bobbyowsinskiblog.com/bruce-swedien-interview/",
                    "checkov · CC BY-SA 2.0 DE",
                    "https://commons.wikimedia.org/wiki/File:Bruce_Swedien.jpg"
            )
    );

    public List<ArtistQuote> getFeaturedQuotes() {
        return FEATURED_QUOTES;
    }
}
