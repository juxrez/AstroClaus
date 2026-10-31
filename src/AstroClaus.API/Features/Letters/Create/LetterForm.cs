using System.ComponentModel.DataAnnotations;

namespace AstroClaus.API.Features.Letters.Create;

/// <summary>The letter as sent from the page. Text is cleaned as it arrives (<see cref="LetterText"/>), so the
/// checks below run on what will be saved: a nickname of only invisible characters counts as empty.</summary>
public class LetterForm
{
    [Required(ErrorMessage = "Add a nickname so Santa knows who it's from.")]
    [StringLength(LetterLimits.FromMax, ErrorMessage = "Nicknames can be up to {1} characters.")]
    public string From { get; set => field = LetterText.CleanLine(value); } = "";

    [Required(ErrorMessage = "Write a little message for Santa.")]
    [StringLength(LetterLimits.MessageMax, ErrorMessage = "Messages can be up to {1} characters.")]
    public string Message { get; set => field = LetterText.CleanMessage(value); } = "";

    [MinLength(1, ErrorMessage = "Add at least one wish.")]
    [MaxLength(LetterLimits.MaxWishes, ErrorMessage = "A letter can hold up to {1} wishes.")]
    public List<WishForm> Wishes { get; set; } = [];
}
