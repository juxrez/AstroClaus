using AstroClaus.API.Features.Letters;

namespace AstroClaus.API.Tests.Letters;

/// <summary>An in-memory store that remembers what the feature asked of it.</summary>
public sealed class FakeLetterStore : ILetterStore
{
    private readonly Dictionary<string, Letter> _letters = [];

    public int SaveCalls { get; private set; }
    public int GetCalls { get; private set; }
    public Letter? SavedLetter { get; private set; }
    public IReadOnlyList<StoredImage> SavedImages { get; private set; } = [];

    public void Add(Letter letter) => _letters[letter.Id] = letter;

    public Task SaveAsync(Letter letter, IReadOnlyList<StoredImage> images, CancellationToken ct)
    {
        SaveCalls++;
        SavedLetter = letter;
        SavedImages = images;
        return Task.CompletedTask;
    }

    public Task<Letter?> GetAsync(string id, CancellationToken ct)
    {
        GetCalls++;
        return Task.FromResult(_letters.GetValueOrDefault(id));
    }

    public Task<(Stream Content, string ContentType)?> OpenImageAsync(string id, string fileName, CancellationToken ct) =>
        throw new NotSupportedException("No test reads images back.");
}
