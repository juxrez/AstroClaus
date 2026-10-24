namespace AstroClaus.API.Features.Letters.View;

/// <summary>
/// The letter behind "See an example letter" on Landing (design/DESIGN.md §4). It is built into the
/// app and never stored, so it never expires. Its pictures are static files in
/// wwwroot/letter/example/images/, which are served ahead of the letter image endpoint.
/// </summary>
public static class ExampleLetter
{
    /// <summary>Not a valid letter id (those are 11 characters), so it can never clash with a real letter.</summary>
    public const string Id = "example";

    /// <summary>The example is always sent today, so its postmark never looks old.</summary>
    public static Letter Create(DateTimeOffset today) => new(
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
}
