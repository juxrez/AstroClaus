using AstroClaus.API.Features.Letters;

namespace AstroClaus.API.Tests.Letters;

public class LetterIdGeneratorTests
{
    [Test]
    public void GenerateNew_ReturnsAnIdThatPassesTheCheck()
    {
        // Arrange: nothing to set up

        // Act
        var id = LetterIdGenerator.GenerateNew();

        // Assert
        Assert.That(LetterIdGenerator.IsValid(id), Is.True);
    }

    [TestCase("QIA164xJYio", true)]
    [TestCase("a_b-c_d-e_f", true)]
    [TestCase(null, false)]
    [TestCase("", false)]
    [TestCase("QIA164xJYi", false)]   // one character short
    [TestCase("QIA164xJYio1", false)] // one character long
    [TestCase("QIA164xJYi!", false)]  // right length, character not allowed
    public void IsValid_AcceptsOnlyIdsOfTheRightShape(string? id, bool expected)
    {
        // Arrange: the id comes from the test case

        // Act
        var result = LetterIdGenerator.IsValid(id);

        // Assert
        Assert.That(result, Is.EqualTo(expected));
    }

    [TestCase("0-0.png", true)]
    [TestCase("9-1.jpg", true)]
    [TestCase("10-1.webp", true)]
    [TestCase("0-1.gif", false)]
    [TestCase("../0-0.png", false)]
    [TestCase("0-0.png/extra", false)]
    [TestCase("", false)]
    [TestCase(null, false)]
    public void IsValidImageName_AcceptsOnlyTheNamesTheAppCreates(string? name, bool expected)
    {
        // Arrange: the name comes from the test case

        // Act
        var result = LetterIdGenerator.IsValidImageName(name);

        // Assert
        Assert.That(result, Is.EqualTo(expected));
    }
}
