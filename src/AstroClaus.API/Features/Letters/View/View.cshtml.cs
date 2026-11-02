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

        // A letter its sender deleted: its link shows the fireplace (Letters/Gone)
        if (Letter is null && LetterIdGenerator.IsValid(id) && await store.WasDeletedAsync(id, ct))
        {
            return Redirect($"{Request.PathBase}/letter/{id}/gone");
        }

        if (Letter is null)
        {
            Response.StatusCode = StatusCodes.Status404NotFound;
            return Page();
        }

        JustSent = sent;
        // In the sender's language, so a link preview shows in it; a reader still gets their own (Languages)
        ShareUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/letter/{Letter.Id}";
        return Page();
    }

    /// <summary>
    /// Deletes the letter and its pictures, for the browser that sent it: the page script sends the
    /// delete key it kept (wwwroot/js/app.js). A wrong key, or a letter without one, deletes nothing.
    /// </summary>
    public async Task<IActionResult> OnPostDeleteAsync(string id, string? key, CancellationToken ct)
    {
        var letter = LetterIdGenerator.IsValid(id) ? await store.GetAsync(id, ct) : null;
        if (letter is null || !DeleteKey.Matches(key, letter.DeleteKeyHash))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        await store.DeleteAsync(letter, ct);
        return new NoContentResult();
    }
}
