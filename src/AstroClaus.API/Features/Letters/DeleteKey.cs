using System.Security.Cryptography;
using System.Text;

namespace AstroClaus.API.Features.Letters;

/// <summary>
/// Proof that a visitor sent a letter, so they can delete it. The key goes only to the browser that
/// sent the letter (wwwroot/js/app.js keeps it there); the letter stores only its hash, so a stored
/// letter can't be used to delete itself.
/// </summary>
public static class DeleteKey
{
    /// <summary>16 random bytes, URL-safe, 22 characters.</summary>
    public static string GenerateNew() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(16)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static string Hash(string key) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));

    /// <summary>Compares in constant time, so the answer's timing gives nothing away.</summary>
    public static bool Matches(string? key, string? hash) =>
        key is { Length: > 0 } && hash is not null
        && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(key)), Encoding.ASCII.GetBytes(hash));
}
