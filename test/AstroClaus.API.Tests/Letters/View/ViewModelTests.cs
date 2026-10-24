using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.View;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Tests.Letters.View;

public class ViewModelTests
{
    private const string KnownId = "QIA164xJYio";

    [Test]
    public async Task IdThatIsNotValid_Gives404WithoutAskingTheStore()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store);

        // Act
        var result = await model.OnGetAsync("not-a-letter-id", sent: false, CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.Response.StatusCode, Is.EqualTo(StatusCodes.Status404NotFound));
            Assert.That(model.Letter, Is.Null);
            Assert.That(store.GetCalls, Is.Zero);
        });
    }

    [Test]
    public async Task LetterThatDoesNotExist_Gives404()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store);

        // Act
        var result = await model.OnGetAsync(KnownId, sent: false, CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.Response.StatusCode, Is.EqualTo(StatusCodes.Status404NotFound));
            Assert.That(model.Letter, Is.Null);
            Assert.That(store.GetCalls, Is.EqualTo(1));
        });
    }

    [TestCase(true)]
    [TestCase(false)]
    public async Task KnownLetter_IsShownWithItsShareLink(bool sent)
    {
        // Arrange
        var store = new FakeLetterStore();
        store.Add(new Letter(KnownId, "Ana", "Hello Santa", DateTimeOffset.UtcNow, [new Wish("a red bike", [])]));
        var model = NewModel(store);

        // Act
        var result = await model.OnGetAsync(KnownId, sent, CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.Response.StatusCode, Is.EqualTo(StatusCodes.Status200OK));
            Assert.That(model.Letter?.From, Is.EqualTo("Ana"));
            Assert.That(model.JustSent, Is.EqualTo(sent));
            Assert.That(model.ShareUrl, Is.EqualTo($"https://astro.test/letter/{KnownId}"));
        });
    }

    [Test]
    public async Task ExampleId_ShowsTheBuiltInExampleWithoutAskingTheStore()
    {
        // Arrange
        var store = new FakeLetterStore();
        var model = NewModel(store);

        // Act
        var result = await model.OnGetAsync(ExampleLetter.Id, sent: true, CancellationToken.None);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(result, Is.TypeOf<PageResult>());
            Assert.That(model.Response.StatusCode, Is.EqualTo(StatusCodes.Status200OK));
            Assert.That(model.IsExample, Is.True);
            Assert.That(model.Letter?.Id, Is.EqualTo(ExampleLetter.Id));
            Assert.That(model.JustSent, Is.False);
            Assert.That(store.GetCalls, Is.Zero);
        });
    }

    private static ViewModel NewModel(FakeLetterStore store)
    {
        var http = new DefaultHttpContext();
        http.Request.Scheme = "https";
        http.Request.Host = new HostString("astro.test");
        return new ViewModel(store) { PageContext = new PageContext { HttpContext = http } };
    }
}
