using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.View;

public class ViewModel(ILetterStore store) : PageModel
{
    public Letter? Letter { get; private set; }
    public string ShareUrl { get; private set; } = "";
    public bool JustSent { get; private set; }

    public async Task<IActionResult> OnGetAsync(string id, bool sent, CancellationToken ct)
    {
        if (LetterId.IsValid(id))
        {
            Letter = await store.GetAsync(id, ct);
        }

        if (Letter is null)
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            return Page();
        }

        JustSent = sent;
        ShareUrl = $"{Request.Scheme}://{Request.Host}/letter/{Letter.Id}";
        return Page();
    }
}

public static class LetterImageEndpoint
{
    public static void MapLetterImages(this IEndpointRouteBuilder app) =>
        app.MapGet("/letter/{id}/images/{file}", async (string id, string file, ILetterStore store, HttpContext http, CancellationToken ct) =>
        {
            if (!LetterId.IsValid(id) || !LetterId.IsValidImageName(file))
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
