using System.ComponentModel.DataAnnotations;

namespace AstroClaus.API.Features.Letters.Create;

/// <summary>One wish as sent from the page; its name is cleaned as it arrives (<see cref="LetterText"/>).</summary>
public class WishForm
{
    [Required(ErrorMessage = "Every wish needs a name.")]
    [StringLength(LetterLimits.WishNameMax, ErrorMessage = "Wish names can be up to {1} characters.")]
    public string Name { get; set => field = LetterText.CleanLine(value); } = "";

    /// <summary>Optional. Checked to be a web link in <see cref="CreateModel"/>.</summary>
    [StringLength(LetterLimits.WishLinkMax, ErrorMessage = "Links can be up to {1} characters.")]
    public string? Link { get; set => field = string.IsNullOrWhiteSpace(value) ? null : value.Trim(); }

    public IFormFile? Image1 { get; set; }
    public IFormFile? Image2 { get; set; }
}
