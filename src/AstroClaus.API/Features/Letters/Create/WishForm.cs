using System.ComponentModel.DataAnnotations;

namespace AstroClaus.API.Features.Letters.Create;

public class WishForm
{
    [Required(ErrorMessage = "Every wish needs a name.")]
    [StringLength(LetterLimits.WishNameMax, ErrorMessage = "Wish names can be up to {1} characters.")]
    public string Name { get; set; } = "";

    public IFormFile? Image1 { get; set; }
    public IFormFile? Image2 { get; set; }
}
