using System.ComponentModel.DataAnnotations;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.Create;

namespace AstroClaus.API.Tests.Letters.Create;

public class CreateFormValidationTests
{
    [Test]
    public void ACompleteForm_HasNoErrors()
    {
        // Arrange
        var form = ValidForm();

        // Act
        var errors = Validate(form);

        // Assert
        Assert.That(errors, Is.Empty);
    }

    [Test]
    public void EmptyNicknameAndMessage_AreBothRejected()
    {
        // Arrange
        var form = ValidForm();
        form.From = "";
        form.Message = " ";

        // Act
        var errors = Validate(form);

        // Assert
        Assert.That(errors.SelectMany(e => e.MemberNames), Is.EquivalentTo(new[] { "From", "Message" }));
    }

    [Test]
    public void TooLongNicknameAndMessage_AreRejectedWithTheLimitInTheText()
    {
        // Arrange
        var form = ValidForm();
        form.From = new string('a', LetterLimits.FromMax + 1);
        form.Message = new string('b', LetterLimits.MessageMax + 1);

        // Act
        var errors = Validate(form);

        // Assert
        var nickname = errors.Single(e => e.MemberNames.Contains("From"));
        var message = errors.Single(e => e.MemberNames.Contains("Message"));
        Assert.Multiple(() =>
        {
            Assert.That(nickname.ErrorMessage, Does.Contain(LetterLimits.FromMax.ToString()));
            Assert.That(message.ErrorMessage, Does.Contain(LetterLimits.MessageMax.ToString()));
        });
    }

    [TestCase(0)]
    [TestCase(LetterLimits.MaxWishes + 1)]
    public void ANumberOfWishesOutsideTheLimits_IsRejected(int wishCount)
    {
        // Arrange
        var form = ValidForm();
        form.Wishes = Enumerable.Range(0, wishCount).Select(i => new WishForm { Name = $"wish {i}" }).ToList();

        // Act
        var errors = Validate(form);

        // Assert
        Assert.That(errors.SelectMany(e => e.MemberNames), Is.EqualTo(new[] { "Wishes" }));
    }

    [Test]
    public void WishNames_EmptyOrTooLong_AreRejected()
    {
        // Arrange
        var empty = new WishForm { Name = "" };
        var tooLong = new WishForm { Name = new string('c', LetterLimits.WishNameMax + 1) };

        // Act
        var emptyErrors = Validate(empty);
        var tooLongErrors = Validate(tooLong);

        // Assert
        Assert.Multiple(() =>
        {
            Assert.That(emptyErrors.SelectMany(e => e.MemberNames), Is.EqualTo(new[] { "Name" }));
            Assert.That(tooLongErrors.Single().ErrorMessage, Does.Contain(LetterLimits.WishNameMax.ToString()));
        });
    }

    private static LetterForm ValidForm() => new()
    {
        From = "Ana",
        Message = "Hello Santa",
        Wishes = [new WishForm { Name = "a red bike" }]
    };

    private static List<ValidationResult> Validate(object form)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(form, new ValidationContext(form), results, validateAllProperties: true);
        return results;
    }
}
