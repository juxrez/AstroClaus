using AstroClaus.API.Features.Language;

namespace AstroClaus.API.Features.Seo;

/// <summary>
/// robots.txt and sitemap.xml. Only the pages anyone may find are listed (Landing and Create), in English
/// and Spanish, each naming the other (Features/Language/Languages.cs). Letters are private to whoever has
/// the link, so they carry noindex instead (_Layout) and are never listed. Crawlers stay allowed everywhere so
/// they can read that noindex, and so link previews (WhatsApp...) can fetch a letter's page.
/// Both need the site's own address, which differs per environment, so they are built per request.
/// </summary>
public static class SeoEndpoints
{
    /// <summary>The pages in the sitemap, as English paths; each page also sets them as its Canonical.</summary>
    private static readonly string[] ListedPages = ["/", "/write"];

    /// <summary>
    /// www.astroclaus.app answers too, but search engines should see one site, not two copies:
    /// any www address moves for good to the same address without www.
    /// </summary>
    public static IApplicationBuilder UseOneHost(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        var request = context.Request;
        if (request.Host.Host.StartsWith("www.", StringComparison.OrdinalIgnoreCase))
        {
            var host = request.Host.Port is { } port
                ? new HostString(request.Host.Host[4..], port)
                : new HostString(request.Host.Host[4..]);
            context.Response.Redirect($"{request.Scheme}://{host}{request.PathBase}{request.Path}{request.QueryString}", permanent: true);
            return;
        }
        await next(context);
    });

    public static void MapSeo(this IEndpointRouteBuilder app)
    {
        app.MapGet("/robots.txt", (HttpRequest request) => Results.Text(
            $"""
            User-agent: *
            Allow: /

            Sitemap: {Site(request)}/sitemap.xml

            """,
            "text/plain"));

        app.MapGet("/sitemap.xml", (HttpRequest request) =>
        {
            var urls = ListedPages.Select(page =>
            {
                var english = $"{Site(request)}{page}";
                var spanish = $"{Site(request)}{Languages.SpanishBase}{page}";
                var languages = $"""
                        <xhtml:link rel="alternate" hreflang="en" href="{english}"/>
                        <xhtml:link rel="alternate" hreflang="es" href="{spanish}"/>
                        <xhtml:link rel="alternate" hreflang="x-default" href="{english}"/>
                    """;
                return $"""
                      <url>
                        <loc>{english}</loc>
                    {languages}
                      </url>
                      <url>
                        <loc>{spanish}</loc>
                    {languages}
                      </url>
                    """;
            });
            return Results.Text(
                $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
                {string.Join("\n", urls)}
                </urlset>

                """,
                "application/xml");
        });
    }

    private static string Site(HttpRequest request) => $"{request.Scheme}://{request.Host}";
}
