using AstroClaus.API.Features.Language;

namespace AstroClaus.API.Features.Letters.View;

/// <summary>
/// The letter behind "See an example letter" on Landing (design/DESIGN.md §4). It is built into the
/// app and never stored, so it never expires. Its pictures are static files in
/// wwwroot/letter/example/images/, which are served ahead of the letter image endpoint. Spanish
/// pages show it as written in Spanish, with the same pictures.
/// </summary>
public static class ExampleLetter
{
    /// <summary>Not a valid letter id (those are 11 characters), so it can never clash with a real letter.</summary>
    public const string Id = "example";

    /// <summary>The example is always sent today, so its postmark never looks old.</summary>
    public static Letter Create(DateTimeOffset today) => Languages.IsSpanish ? Spanish(today) : English(today);

    private static Letter English(DateTimeOffset today) => new(
        Id,
        From: "Mia",
        Message: "I tried really hard to be kind this year. I shared my crayons and I helped Grandma bake cookies. Please say hi to the reindeer for me!",
        CreatedAt: today,
        Wishes:
        [
            new Wish("A big box of crayons with a sharpener", ["0-0.png"]),
            new Wish("A sled that goes really fast", ["1-0.png", "1-1.png"]),
            new Wish("A book about dinosaurs", []),
            new Wish("Snow on Christmas morning", []),
        ]);

    private static Letter Spanish(DateTimeOffset today) => new(
        Id,
        From: "Mia",
        Message: "Este año me esforcé mucho por ser amable. Compartí mis crayones y ayudé a mi abuelita a hornear galletas. ¡Por favor salúdame a los renos!",
        CreatedAt: today,
        Wishes:
        [
            new Wish("Una caja grande de crayones con sacapuntas", ["0-0.png"]),
            new Wish("Un trineo que vaya muy rápido", ["1-0.png", "1-1.png"]),
            new Wish("Un libro de dinosaurios", []),
            new Wish("Que nieve en la mañana de Navidad", []),
        ]);
}
