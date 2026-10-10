namespace AstroClaus.API.Features.Letters;

public sealed record StoredImage(string FileName, string ContentType, byte[] Bytes);
