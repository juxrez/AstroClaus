namespace AstroClaus.API.Features.Seo;

/// <summary>
/// robots.txt and sitemap.xml. Only Landing is listed: letters are private to whoever has the link,
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

        app.MapGet("/sitemap.xml", (HttpRequest request) => Results.Text(
            $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>{Site(request)}/</loc></url>
            </urlset>

            """,
            "application/xml"));
    }

    private static string Site(HttpRequest request) => $"{request.Scheme}://{request.Host}";
}
