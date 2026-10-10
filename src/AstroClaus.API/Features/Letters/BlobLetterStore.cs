using System.Net;
using System.Text.Json;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace AstroClaus.API.Features.Letters;

/// <summary>
/// One container, one folder per letter: "{id}/letter.json" plus "{id}/{image}".
/// Letters are written once and never overwritten. The 90-day retention is an
/// Azure lifecycle rule (see /infra), not app code.
/// </summary>
public sealed class BlobLetterStore(BlobServiceClient service) : ILetterStore
{
    private const string ContainerName = "letters";
    private const string LetterFileName = "letter.json";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task SaveAsync(Letter letter, IReadOnlyList<StoredImage> images, CancellationToken ct)
    {
        var container = service.GetBlobContainerClient(ContainerName);

        var onlyIfNew = new BlobRequestConditions { IfNoneMatch = ETag.All };

        foreach (var image in images)
        {
            await GetBlobPath(container, letter.Id, image.FileName).UploadAsync(
                BinaryData.FromBytes(image.Bytes),
                new BlobUploadOptions
                {
                    Conditions = onlyIfNew,
                    HttpHeaders = new BlobHttpHeaders 
                    {
                        ContentType = image.ContentType 
                    }
                },
                ct);
        }

        // Written last, so a letter only exists once all its images are stored.
        await GetBlobPath(container, letter.Id, LetterFileName).UploadAsync(
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
        var container = service.GetBlobContainerClient(ContainerName);
        try
        {
            var result = await GetBlobPath(container, id, LetterFileName).DownloadContentAsync(ct);
            return result.Value.Content.ToObjectFromJson<Letter>(Json);
        }
        catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<(Stream Content, string ContentType)?> OpenImageAsync(string id, string fileName, CancellationToken ct)
    {
        var container = service.GetBlobContainerClient(ContainerName);

        try
        {
            var result = await GetBlobPath(container, id, fileName).DownloadStreamingAsync(cancellationToken: ct);
            return (result.Value.Content, result.Value.Details.ContentType);
        }
        catch (RequestFailedException e) when (e.Status == (int)HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the blob client which is like a file path e.g: "1234/letter.json" 
    /// </summary>
    /// <param name="container"></param>
    /// <param name="id">File Id which is the first portion of the file path</param>
    /// <param name="fileName">File name which is the last part of the file path</param>
    /// <returns></returns>
    private static BlobClient GetBlobPath(BlobContainerClient container, string id, string fileName) =>
        container.GetBlobClient($"{id}/{fileName}");
}
