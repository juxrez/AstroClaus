namespace AstroClaus.API.Features.Letters.View;

public static class LetterImageEndpoint
{
    public static void MapLetterImages(this IEndpointRouteBuilder app) =>
        app.MapGet("/letter/{id}/images/{file}", async (string id, string file, ILetterStore store, HttpContext http, CancellationToken ct) =>
        {
            if (!LetterIdGenerator.IsValid(id) || !LetterIdGenerator.IsValidImageName(file))
            {
                return Results.NotFound();
            }

            if (await store.OpenImageAsync(id, file, ct) is not { } image)
            {
                return Results.NotFound();
            }

            // Letters never change, so the picture can be cached for good.
            http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Results.Stream(image.Content, image.ContentType);
        });
}
