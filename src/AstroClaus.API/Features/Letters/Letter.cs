namespace AstroClaus.API.Features.Letters;

public static class LetterLimits
{
    public const int FromMax = 30;
    public const int MessageMax = 150;
    public const int WishNameMax = 60;
    public const int MaxWishes = 10;
    public const int MaxImagesPerWish = 2;
    public const int MaxImageBytes = 300 * 1024;
}

public sealed record Letter(
    string Id,
    string From,
    string Message,
    DateTimeOffset CreatedAt,
    IReadOnlyList<Wish> Wishes);

/// <param name="Images">File names inside the letter, e.g. "0-1.png".</param>
public sealed record Wish(string Name, IReadOnlyList<string> Images);

public sealed record StoredImage(string FileName, string ContentType, byte[] Bytes);
