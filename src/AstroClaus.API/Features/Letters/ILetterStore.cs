namespace AstroClaus.API.Features.Letters;

public interface ILetterStore
{
    Task SaveAsync(Letter letter, IReadOnlyList<StoredImage> images, CancellationToken ct);
    Task<Letter?> GetAsync(string id, CancellationToken ct);
    Task<(Stream Content, string ContentType)?> OpenImageAsync(string id, string fileName, CancellationToken ct);
    Task DeleteAsync(Letter letter, CancellationToken ct);

    /// <summary>True if the letter was deleted by its sender (as opposed to never existing, or expired).</summary>
    Task<bool> WasDeletedAsync(string id, CancellationToken ct);
}
