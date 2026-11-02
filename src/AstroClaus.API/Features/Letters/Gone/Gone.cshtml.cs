using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.Gone;

/// <summary>
/// Where a deleted letter's link leads: the letter went into the fireplace. Shown to the sender right
/// after deleting, and to anyone who opens the link later, for as long as the deleted marker is kept
/// (BlobLetterStore). Any other letter goes back to its own page, which shows it or says it was delivered.
/// </summary>
public class GoneModel(ILetterStore store) : PageModel
{
    public async Task<IActionResult> OnGetAsync(string id, CancellationToken ct)
    {
        if (!LetterIdGenerator.IsValid(id) || !await store.WasDeletedAsync(id, ct))
        {
            return Redirect($"{Request.PathBase}/letter/{Uri.EscapeDataString(id)}");
        }

        return Page();
    }
}
