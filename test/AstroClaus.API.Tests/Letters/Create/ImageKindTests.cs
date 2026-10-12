using System.Text;
using AstroClaus.API.Features.Letters.Create;

namespace AstroClaus.API.Tests.Letters.Create;

public class ImageKindTests
{
    [TestCase(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10 }, "jpg", "image/jpeg")]
    [TestCase(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00 }, "png", "image/png")]
    [TestCase(new byte[] { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00 }, "webp", "image/webp")]
    public void Detect_RecognisesJpgPngAndWebpBySignature(byte[] bytes, string extension, string contentType)
    {
        // Arrange: the file content comes from the test case

        // Act
        var kind = ImageKind.Detect(bytes);

        // Assert
        Assert.That(kind, Is.EqualTo(new ImageKind(extension, contentType)));
    }

    [TestCase("")]
    [TestCase("just some text")]
    [TestCase("GIF89a-a-format-we-do-not-accept")]
    [TestCase("RIFF\0\0\0\0WAVEfmt ")] // a RIFF file that is not WebP
    public void Detect_ReturnsNothing_ForAnyOtherContent(string content)
    {
        // Arrange
        var bytes = Encoding.Latin1.GetBytes(content);

        // Act
        var kind = ImageKind.Detect(bytes);

        // Assert
        Assert.That(kind, Is.Null);
    }
}
