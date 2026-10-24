using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.View;

public class ViewModel(ILetterStore store) : PageModel
{
    public Letter? Letter { get; private set; }
    public string ShareUrl { get; private set; } = "";
    public bool JustSent { get; private set; }

    /// <summary>The built-in example letter: it has no share section and no "Kept until" date.</summary>
    public bool IsExample { get; private set; }

    public async Task<IActionResult> OnGetAsync(string id, bool sent, CancellationToken ct)
    {
        if (id == ExampleLetter.Id)
        {
            Letter = ExampleLetter.Create(DateTimeOffset.UtcNow);
            IsExample = true;
            return Page();
        }

        if (LetterIdGenerator.IsValid(id))
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
