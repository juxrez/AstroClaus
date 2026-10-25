namespace AstroClaus.API.Features.Letters;

public static class LetterLimits
{
    public const int FromMax = 30;
    public const int MessageMax = 150;
    public const int WishNameMax = 60;

    /// <summary>Shop links with tracking get long; this still fits nearly all of them.</summary>
    public const int WishLinkMax = 500;
    public const int MaxWishes = 10;

    /// <summary>Matches the picture fields on <see cref="Create.WishForm"/> (Image1, Image2).</summary>
    public const int MaxImagesPerWish = 2;

    /// <summary>The page shrinks pictures before sending them (phone photos are several MB), so this is rarely reached.</summary>
    public const int MaxImageMb = 1;
    public const int MaxImageBytes = MaxImageMb * 1024 * 1024;

    /// <summary>The whole form: 20 pictures at 1 MB is about 21 MB, the rest is room for the text fields.</summary>
    public const int MaxRequestBytes = 22_000_000;

    /// <summary>How long a letter is kept. The storage lifecycle rule in /infra deletes it; keep the two equal.</summary>
    public const int RetentionDays = 90;
}
