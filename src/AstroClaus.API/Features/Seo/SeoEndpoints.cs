using AstroClaus.API.Features.Language;

namespace AstroClaus.API.Features.Seo;

/// <summary>
/// robots.txt and sitemap.xml. Only Landing is listed, in English and Spanish, each naming the other
/// (Features/Language/Languages.cs). Letters are private to whoever has the link,
/// so they carry noindex instead (_Layout) and are never listed. Crawlers stay allowed everywhere so
/// they can read that noindex, and so link previews (WhatsApp...) can fetch a letter's page.
/// Both need the site's own address, which differs per environment, so they are built per request.
/// </summary>
public static class SeoEndpoints
{
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
            var english = $"{Site(request)}/";
            var spanish = $"{Site(request)}{Languages.SpanishBase}/";
            var languages = $"""
                    <xhtml:link rel="alternate" hreflang="en" href="{english}"/>
                    <xhtml:link rel="alternate" hreflang="es" href="{spanish}"/>
                    <xhtml:link rel="alternate" hreflang="x-default" href="{english}"/>
                """;
            return Results.Text(
                $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
                  <url>
                    <loc>{english}</loc>
                {languages}
                  </url>
                  <url>
                    <loc>{spanish}</loc>
                {languages}
                  </url>
                </urlset>

                """,
                "application/xml");
        });
    }

    private static string Site(HttpRequest request) => $"{request.Scheme}://{request.Host}";
}
