using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Error;

/// <summary>
/// The friendly error page. Program.cs sends two kinds of requests here: unexpected failures
/// (UseExceptionHandler, "/error") and error responses without a body of their own
/// (UseStatusCodePagesWithReExecute, "/error/{status code}"). Failures are already logged by
/// the exception handler; this page only apologises.
/// </summary>
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[IgnoreAntiforgeryToken] // failed POSTs, such as sending a letter, are re-run here as POSTs too
public class ErrorModel : PageModel
{
    /// <summary>The original status code, when one was passed in the address.</summary>
    [BindProperty(SupportsGet = true)]
    public int? Code { get; set; }

    public bool IsNotFound => Code == StatusCodes.Status404NotFound;
}
