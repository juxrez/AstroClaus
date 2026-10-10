using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.Create;

[RequestSizeLimit(LetterLimits.MaxRequestBytes)]
public class CreateModel(ILetterStore store) : PageModel
{
    [BindProperty] public LetterForm Form { get; set; } = new();

    public void OnGet() => Form.Wishes.Add(new WishForm());

    public async Task<IActionResult> OnPostAsync(CancellationToken ct)
    {
        var images = new List<StoredImage>();
        var wishes = new List<Wish>();

        for (var i = 0; i < Form.Wishes.Count; i++)
        {
            wishes.Add(await ReadWishAsync(Form.Wishes[i], i, images, ct));
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        var letter = new Letter(LetterIdGenerator.GenerateNew(), Form.From.Trim(), Form.Message.Trim(), DateTimeOffset.UtcNow, wishes);
        await store.SaveAsync(letter, images, ct);

        return Redirect($"/letter/{letter.Id}?sent=true");
    }

    /// <summary>Checks one wish's pictures, adds the good ones to <paramref name="images"/> and returns the wish.</summary>
    private async Task<Wish> ReadWishAsync(WishForm wish, int index, List<StoredImage> images, CancellationToken ct)
    {
        var names = new List<string>();
        var uploads = new[] { wish.Image1, wish.Image2 }.OfType<IFormFile>().Where(f => f.Length > 0);

        foreach (var file in uploads)
        {
            if (file.Length > LetterLimits.MaxImageBytes)
            {
                ModelState.AddModelError("", $"A picture for \"{wish.Name}\" is over {LetterLimits.MaxImageKb} KB. Try a screenshot instead.");
                continue;
            }

            var bytes = new byte[file.Length];
            await using (var stream = file.OpenReadStream())
            {
                await stream.ReadExactlyAsync(bytes, ct);
            }

            if (ImageKind.Detect(bytes) is not { } kind)
            {
                ModelState.AddModelError("", $"A picture for \"{wish.Name}\" isn't a JPG, PNG or WebP.");
                continue;
            }

            var fileName = $"{index}-{names.Count}.{kind.Extension}";
            names.Add(fileName);
            images.Add(new StoredImage(fileName, kind.ContentType, bytes));
        }

        return new Wish(wish.Name?.Trim() ?? "", names);
    }
}
