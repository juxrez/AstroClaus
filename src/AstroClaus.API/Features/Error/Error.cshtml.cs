using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AstroClaus.API.Features.Error;

/// <summary>
/// Shown when a request fails unexpectedly (UseExceptionHandler in Program.cs). The exception
/// handler has already logged the error; this page only apologises.
/// </summary>
[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
[IgnoreAntiforgeryToken] // failed POSTs, such as sending a letter, are re-run here as POSTs too
public class ErrorModel : PageModel
{
}
