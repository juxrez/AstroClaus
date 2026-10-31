using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Letters.Create;

[RequestSizeLimit(LetterLimits.MaxRequestBytes)]
public class CreateModel(ILetterStore store) : PageModel
{
    private const string StackedMarksMessage = "Some letters here have too many marks stacked on them. Please use regular letters.";
    private const string ContactDetailsMessage = "Anyone with the link can read your letter, so please leave out email addresses and phone numbers.";

    [BindProperty] public LetterForm Form { get; set; } = new();

    public void OnGet() => Form.Wishes.Add(new WishForm());

    /// <summary>
    /// Checks the text of the letter without saving it, so the page knows before the letter folds
    /// and flies to Astro (wwwroot/js/app.js). The page sends it without its pictures; those are
    /// checked when the letter is sent.
    /// </summary>
    public IActionResult OnPostCheck()
    {
        CheckText();
        return ModelState.IsValid ? new NoContentResult() : BadRequest(new ValidationProblemDetails(ModelState));
    }

    public async Task<IActionResult> OnPostAsync(CancellationToken ct)
    {
        CheckText();

        var images = new List<StoredImage>();
        var wishes = new List<Wish>();
        for (var i = 0; i < Form.Wishes.Count; i++)
        {
            wishes.Add(await ReadWishAsync(Form.Wishes[i], i, images, ct));
        }

        if (!ModelState.IsValid)
        {
            // The page's script sends in the background and shows each message on its field;
            // without the script, the page itself is shown again with the messages.
            return SentInTheBackground()
                ? BadRequest(new ValidationProblemDetails(ModelState))
                : Page();
        }

        var letter = new Letter(LetterIdGenerator.GenerateNew(), Form.From, Form.Message, DateTimeOffset.UtcNow, wishes);
        await store.SaveAsync(letter, images, ct);

        return Redirect($"/letter/{letter.Id}?sent=true");
    }

    /// <summary>
    /// Adds an error on each field whose text breaks a rule. The text arrives already cleaned
    /// (LetterForm, WishForm), so the usual checks (required, length) have run on it.
    /// </summary>
    private void CheckText()
    {
        CheckText(nameof(Form.From), Form.From);
        CheckText(nameof(Form.Message), Form.Message);
        for (var i = 0; i < Form.Wishes.Count; i++)
        {
            var field = $"{nameof(Form.Wishes)}[{i}]";
            CheckText($"{field}.{nameof(WishForm.Name)}", Form.Wishes[i].Name);
            if (Form.Wishes[i].Link is { } link && !Wish.IsWebLink(link))
            {
                ModelState.AddModelError($"{nameof(Form)}.{field}.{nameof(WishForm.Link)}", "That isn't a web link. Copy it from your browser's address bar.");
            }
        }
    }

    /// <summary>Adds an error on the field if its text has stacked marks or contact details.</summary>
    private void CheckText(string field, string text)
    {
        var key = $"{nameof(Form)}.{field}";
        if (ModelState.GetFieldValidationState(key) == ModelValidationState.Invalid) return;

        if (LetterText.HasStackedMarks(text)) ModelState.AddModelError(key, StackedMarksMessage);
        else if (LetterText.HasContactDetails(text)) ModelState.AddModelError(key, ContactDetailsMessage);
    }

    /// <summary>Checks one wish's pictures, adds the good ones to <paramref name="images"/> and returns the wish.</summary>
    private async Task<Wish> ReadWishAsync(WishForm wish, int index, List<StoredImage> images, CancellationToken ct)
    {
        var field = $"{nameof(Form.Wishes)}[{index}]";
        var names = new List<string>();
        var uploads = new[] { (Name: nameof(WishForm.Image1), File: wish.Image1), (Name: nameof(WishForm.Image2), File: wish.Image2) };

        foreach (var (name, file) in uploads)
        {
            if (file is null || file.Length == 0) continue;
            var key = $"{nameof(Form)}.{field}.{name}";

            if (file.Length > LetterLimits.MaxImageBytes)
            {
                ModelState.AddModelError(key, $"This picture is over {LetterLimits.MaxImageMb} MB. Try a different picture.");
                continue;
            }

            var bytes = new byte[file.Length];
            await using (var stream = file.OpenReadStream())
            {
                await stream.ReadExactlyAsync(bytes, ct);
            }

            if (ImageKind.Detect(bytes) is not { } kind)
            {
                ModelState.AddModelError(key, "This picture isn't a JPG, PNG or WebP.");
                continue;
            }

            var fileName = $"{index}-{names.Count}.{kind.Extension}";
            names.Add(fileName);
            images.Add(new StoredImage(fileName, kind.ContentType, bytes));
        }

        return new Wish(wish.Name, names, wish.Link);
    }

    /// <summary>The page's script asks for the result as JSON (wwwroot/js/app.js, upload).</summary>
    private bool SentInTheBackground() =>
        HttpContext?.Request.Headers.Accept.Any(value => value?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true) == true;
}
