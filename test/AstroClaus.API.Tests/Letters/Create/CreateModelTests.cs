using System.Text;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.Create;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Tests.Letters.Create;

public class CreateModelTests
{
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    [Test]
    public async Task ValidLetter_IsSavedTrimmedAndTheSenderIsSentToIt()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store, new LetterForm
        {
            From = "  Ana ",
            Message = " Hello Santa ",
            Wishes =
            [
                new WishForm { Name = " a red bike ", Image1 = Png() },
                new WishForm { Name = "socks", Image1 = Png(), Image2 = Png() }
            ]
        });

        // Act
        var result = await model.OnPostAsync(CancellationToken.None);

        // Assert
        Assert.That(store.SaveCalls, Is.EqualTo(1));
        var letter = store.SavedLetter!;
        var expectedImages = new[] { "0-0.png", "1-0.png", "1-1.png" };
        Assert.Multiple(() =>
        {
            Assert.That((result as RedirectResult)?.Url, Is.EqualTo($"/letter/{letter.Id}?sent=true"));
            Assert.That(LetterIdGenerator.IsValid(letter.Id), Is.True);
            Assert.That(letter.From, Is.EqualTo("Ana"));
            Assert.That(letter.Message, Is.EqualTo("Hello Santa"));
            Assert.That(letter.Wishes.Select(w => w.Name), Is.EqualTo(new[] { "a red bike", "socks" }));
            Assert.That(letter.Wishes.SelectMany(w => w.Images), Is.EqualTo(expectedImages));
            Assert.That(store.SavedImages.Select(i => i.FileName), Is.EqualTo(expectedImages));
            Assert.That(store.SavedImages.Select(i => i.ContentType), Has.All.EqualTo("image/png"));
        });
    }

    [Test]
    public async Task PictureExactlyAtTheLimit_IsAccepted()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store, FormWithOnePicture(Png(LetterLimits.MaxImageBytes)));

        // Act
        var result = await model.OnPostAsync(CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<RedirectResult>());
            Assert.That(store.SaveCalls, Is.EqualTo(1));
        });
    }

    [Test]
    public async Task PictureOverTheLimit_ShowsAnErrorAndSavesNothing()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store, FormWithOnePicture(Png(LetterLimits.MaxImageBytes + 1)));

        // Act
        var result = await model.OnPostAsync(CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.ModelState.ErrorCount, Is.EqualTo(1));
            Assert.That(store.SaveCalls, Is.Zero);
        });
    }

    [Test]
    public async Task FileThatIsNotAnImage_ShowsAnErrorAndSavesNothing()
    {
        // Arrange
        var store = new FakeLetterStore();
        var notAnImage = FormFileOf(Encoding.UTF8.GetBytes("this is only text"));
        var model = NewModel(store, FormWithOnePicture(notAnImage));

        // Act
        var result = await model.OnPostAsync(CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.ModelState.ErrorCount, Is.EqualTo(1));
            Assert.That(store.SaveCalls, Is.Zero);
        });
    }

    [Test]
    public async Task FormThatFailedValidation_ShowsThePageAndSavesNothing()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store, FormWithOnePicture(Png()));
        model.ModelState.AddModelError("Form.From", "A nickname is needed.");

        // Act
        var result = await model.OnPostAsync(CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(store.SaveCalls, Is.Zero);
        });
    }

    private static CreateModel NewModel(FakeLetterStore store, LetterForm form) =>
        new(store) { Form = form, PageContext = new PageContext() };

    private static LetterForm FormWithOnePicture(IFormFile picture) => new()
    {
        From = "Ana",
        Message = "Hello Santa",
        Wishes = [new WishForm { Name = "a red bike", Image1 = picture }]
    };

    private static IFormFile Png(int size = 64)
    {
        var bytes = new byte[size];
        PngSignature.CopyTo(bytes, 0);
        return FormFileOf(bytes);
    }

    private static IFormFile FormFileOf(byte[] bytes) =>
        new FormFile(new MemoryStream(bytes), 0, bytes.Length, "image", "picture");
}
