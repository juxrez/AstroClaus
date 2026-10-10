namespace AstroClaus.API.Features.Letters;

public sealed record Letter(
    string Id,
    string From,
    string Message,
    DateTimeOffset CreatedAt,
    IReadOnlyList<Wish> Wishes);

/// <param name="Images">File names inside the letter, e.g. "0-1.png".</param>
public sealed record Wish(string Name, IReadOnlyList<string> Images);
