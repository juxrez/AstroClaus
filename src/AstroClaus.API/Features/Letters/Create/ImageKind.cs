namespace AstroClaus.API.Features.Letters.Create;

public readonly record struct ImageKind(string Extension, string ContentType)
{
    /// <summary>Decides by file signature, never by the name or type the browser sent.</summary>
    public static ImageKind? Detect(ReadOnlySpan<byte> b) => b switch
    {
        [0xFF, 0xD8, 0xFF, ..] => new("jpg", "image/jpeg"),
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => new("png", "image/png"),
        [(byte)'R', (byte)'I', (byte)'F', (byte)'F', _, _, _, _, (byte)'W', (byte)'E', (byte)'B', (byte)'P', ..] => new("webp", "image/webp"),
        _ => null
    };
}
