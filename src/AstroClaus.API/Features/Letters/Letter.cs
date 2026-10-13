namespace AstroClaus.API.Features.Letters;

public sealed record Letter(
    string Id,
    string From,
    string Message,
    DateTimeOffset CreatedAt,
    IReadOnlyList<Wish> Wishes);

/// <param name="Images">File names inside the letter, e.g. "0-1.png".</param>
/// <param name="Link">Optional web page where the wish can be found. Letters saved before links existed have none.</param>
public sealed record Wish(string Name, IReadOnlyList<string> Images, string? Link = null)
{
    /// <summary>
    /// A wish link must be an absolute http(s) address. A letter is a public page, so anything
    /// else (javascript:, data:, file:...) is never accepted or shown.
    /// </summary>
    public static bool IsWebLink(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
        && uri.Host.Length > 0;
}
