namespace AstroClaus.API.Features.Protection;

/// <summary>
/// Three headers on every response:
/// - No other site may show ours in a frame, so a page can't lay its own content over our buttons.
/// - Browsers take a picture's type as we state it (checked on upload, ImageKind) and never read an
///   uploaded picture as a page or a script.
/// - Following a link to another site tells it only our domain, never the page: a letter's address is
///   what keeps it private.
/// </summary>
public static class SafetyHeaders
{
    public static IApplicationBuilder UseSafetyHeaders(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        // Added as the response starts, so error pages, which clear the response, get them too
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XFrameOptions = "DENY";
            headers.ContentSecurityPolicy = "frame-ancestors 'none'";
            headers.XContentTypeOptions = "nosniff";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            return Task.CompletedTask;
        });
        await next(context);
    });
}
