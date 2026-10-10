using System.Net;
using System.Text.Json;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace AstroClaus.API.Features.Letters;

public interface ILetterStore
{
    Task SaveAsync(Letter letter, IReadOnlyList<StoredImage> images, CancellationToken ct);
    Task<Letter?> GetAsync(string id, CancellationToken ct);
    Task<(Stream Content, string ContentType)?> OpenImageAsync(string id, string fileName, CancellationToken ct);
}

/// <summary>
/// One container, one folder per letter: "{id}/letter.json" plus "{id}/{image}".
/// Letters are written once and never overwritten. The 90-day retention is an
/// Azure lifecycle rule (see /infra), not app code.
/// </summary>
public sealed class BlobLetterStore(BlobServiceClient service) : ILetterStore
{
    private const string ContainerName = "letters";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly Lazy<Task<BlobContainerClient>> _container = new(async () =>
    {
        try
        {
            var container = service.GetBlobContainerClient(ContainerName);
            await container.CreateIfNotExistsAsync();
            return container;
        }
        catch (Exception ex)
        {

            throw ex;
        }
        
    });

    public async Task SaveAsync(Letter letter, IReadOnlyList<StoredImage> images, CancellationToken ct)
    {
        var container = await _container.Value;
        var onlyIfNew = new BlobRequestConditions { IfNoneMatch = ETag.All };

        foreach (var image in images)
        {
            await container.GetBlobClient($"{letter.Id}/{image.FileName}").UploadAsync(
                BinaryData.FromBytes(image.Bytes),
                new BlobUploadOptions
                {
                    Conditions = onlyIfNew,
                    HttpHeaders = new BlobHttpHeaders { ContentType = image.ContentType }
                },
                ct);
        }

        // Written last, so a letter only exists once all its images are stored.
        await container.GetBlobClient($"{letter.Id}/letter.json").UploadAsync(
            BinaryData.FromObjectAsJson(letter, Json),
            new BlobUploadOptions
            {
                Conditions = onlyIfNew,
                HttpHeaders = new BlobHttpHeaders { ContentType = "application/json" }
            },
            ct);
    }

    public async Task<Letter?> GetAsync(string id, CancellationToken ct)
    {
        var container = await _container.Value;
        try
        {
            var result = await container.GetBlobClient($"{id}/letter.json").DownloadContentAsync(ct);
            return result.Value.Content.ToObjectFromJson<Letter>(Json);
        }
        catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<(Stream Content, string ContentType)?> OpenImageAsync(string id, string fileName, CancellationToken ct)
    {
        var container = await _container.Value;
        try
        {
            var result = await container.GetBlobClient($"{id}/{fileName}").DownloadStreamingAsync(cancellationToken: ct);
            return (result.Value.Content, result.Value.Details.ContentType);
        }
        catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
