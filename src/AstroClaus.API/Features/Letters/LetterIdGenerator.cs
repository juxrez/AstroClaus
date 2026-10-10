using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace AstroClaus.API.Features.Letters;

public static partial class LetterIdGenerator
{
    /// <summary>8 random bytes, URL-safe, 11 characters.</summary>
    public static string GenerateNew() => Base64Url(RandomNumberGenerator.GetBytes(8));

    public static bool IsValid(string? id) => id is not null && IdPattern().IsMatch(id);
    public static bool IsValidImageName(string? name) => name is not null && ImagePattern().IsMatch(name);

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    [GeneratedRegex("^[A-Za-z0-9_-]{11}$")] private static partial Regex IdPattern();
    [GeneratedRegex(@"^\d{1,2}-\d\.(jpg|png|webp)$")] private static partial Regex ImagePattern();
}
