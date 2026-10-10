using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.Create;

[RequestSizeLimit(8000000)]
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
            var wish = Form.Wishes[i];
            var names = new List<string>();
            var uploads = new[] { wish.Image1, wish.Image2 }.Where(f => f is { Length: > 0 }).ToList();

            foreach (var file in uploads)
            {
                if (file!.Length > LetterLimits.MaxImageBytes)
                {
                    ModelState.AddModelError("", $"A picture for \"{wish.Name}\" is over 300 KB. Try a screenshot instead.");
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

                var fileName = $"{i}-{names.Count}.{kind.Extension}";
                names.Add(fileName);
                images.Add(new StoredImage(fileName, kind.ContentType, bytes));
            }

            wishes.Add(new Wish(wish.Name?.Trim() ?? "", names));
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        var letter = new Letter(LetterId.GenerateNew(), Form.From.Trim(), Form.Message.Trim(), DateTimeOffset.UtcNow, wishes);
        await store.SaveAsync(letter, images, ct);

        return Redirect($"/letter/{letter.Id}?sent=true");
    }
}

public class LetterForm
{
    [Required(ErrorMessage = "Add a nickname so Santa knows who it's from.")]
    [StringLength(LetterLimits.FromMax, ErrorMessage = "Nicknames can be up to 30 characters.")]
    public string From { get; set; } = "";

    [Required(ErrorMessage = "Write a little message for Santa.")]
    [StringLength(LetterLimits.MessageMax, ErrorMessage = "Messages can be up to 150 characters.")]
    public string Message { get; set; } = "";

    [MinLength(1, ErrorMessage = "Add at least one wish.")]
    [MaxLength(LetterLimits.MaxWishes, ErrorMessage = "A letter can hold up to 10 wishes.")]
    public List<WishForm> Wishes { get; set; } = [];
}

public class WishForm
{
    [Required(ErrorMessage = "Every wish needs a name.")]
    [StringLength(LetterLimits.WishNameMax, ErrorMessage = "Wish names can be up to 60 characters.")]
    public string Name { get; set; } = "";

    public IFormFile? Image1 { get; set; }
    public IFormFile? Image2 { get; set; }
}

public readonly record struct ImageKind(string Extension, string ContentType)
{
    /// <summary>Decides by file signature, never by the name or type the browser sent.</summary>
    public static ImageKind? Detect(ReadOnlySpan<byte> b) => b switch
    {
        [0xFF, 0xD8, 0xFF, ..] => new("jpg", "image/jpeg"),
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => new("png", "image/png"),
        [(byte)'R', (byte)'I', (byte)'F', (byte)'F', _, _, _, _, (byte)'W', (byte)'E', (byte)'B', (byte)'P', ..] => new("webp", "image/webp"),
        _ => null
    };
}
