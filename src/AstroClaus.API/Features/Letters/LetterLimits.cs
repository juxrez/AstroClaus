namespace AstroClaus.API.Features.Letters;

public static class LetterLimits
{
    public const int FromMax = 30;
    public const int MessageMax = 150;
    public const int WishNameMax = 60;
    public const int MaxWishes = 10;
    public const int MaxImageKb = 500;
    public const int MaxImageBytes = MaxImageKb * 1024;

    /// <summary>The whole form: 20 pictures at 500 KB is about 10 MB, the rest is room for the text fields.</summary>
    public const int MaxRequestBytes = 12_000_000;
}
