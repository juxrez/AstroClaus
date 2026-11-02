using System.Globalization;

namespace AstroClaus.API.Features.Language;

/// <summary>
/// The site in English, at its usual addresses, and in Spanish, at the same addresses under /es.
/// A page opens in the visitor's language: the one they picked with the header's toggle, otherwise
/// their browser's (Spanish if it prefers Spanish, English for anything else). A visitor whose browser
/// names no language, such as a search engine, gets the language of the address it asked for.
/// Spanish requests run with /es as their path base, so routes and "~/" links work the same in both.
/// </summary>
public static class Languages
{
    public const string SpanishBase = "/es";

    /// <summary>The header's toggle links to the current page with ?language=en or ?language=es.</summary>
    public const string ToggleParameter = "language";

    private const string Cookie = "language";

    public static bool IsSpanish => CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "es";

    /// <summary>Runs first, so the error page shown for a request keeps that request's language.</summary>
    public static IApplicationBuilder UseLanguages(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        var request = context.Request;
        var spanishAddress = request.Path.StartsWithSegments(SpanishBase, out var rest);
        var path = spanishAddress ? (rest.HasValue ? rest : "/") : request.Path;

        if (IsPageOpened(request))
        {
            var picked = request.Query[ToggleParameter].ToString();
            if (picked is "en" or "es")
            {
                context.Response.Cookies.Append(Cookie, picked, new CookieOptions
                {
                    MaxAge = TimeSpan.FromDays(365),
                    HttpOnly = true,
                    Secure = request.IsHttps,
                    SameSite = SameSiteMode.Lax,
                    IsEssential = true
                });
                context.Response.Redirect(Address(picked == "es", path));
                return;
            }

            if (WantsSpanish(request) is { } spanish && spanish != spanishAddress)
            {
                context.Response.Redirect(Address(spanish, path) + request.QueryString);
                return;
            }
        }

        if (spanishAddress)
        {
            request.PathBase = request.PathBase.Add(SpanishBase);
            request.Path = path;
        }

        var culture = CultureInfo.GetCultureInfo(spanishAddress ? "es" : "en");
        CultureInfo.CurrentCulture = culture;
        CultureInfo.CurrentUICulture = culture;
        await next(context);
    });

    /// <summary>A page the browser is opening, as opposed to a picture, a script or a letter being sent.</summary>
    private static bool IsPageOpened(HttpRequest request) =>
        HttpMethods.IsGet(request.Method) && request.Headers.Accept.Any(value => value?.Contains("text/html") == true);

    /// <summary>The language picked with the toggle, else the browser's first choice; null when the browser names none.</summary>
    private static bool? WantsSpanish(HttpRequest request)
    {
        if (request.Cookies[Cookie] is "en" or "es") return request.Cookies[Cookie] == "es";

        var first = request.GetTypedHeaders().AcceptLanguage.OrderByDescending(language => language.Quality ?? 1).FirstOrDefault();
        return first is null ? null : first.Value.Value?.StartsWith("es", StringComparison.OrdinalIgnoreCase) == true;
    }

    private static string Address(bool spanish, PathString path) => spanish ? SpanishBase + path : path.ToString();
}
