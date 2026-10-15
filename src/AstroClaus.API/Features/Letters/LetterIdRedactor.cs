using System.Diagnostics;
using System.Text.RegularExpressions;
using OpenTelemetry;

namespace AstroClaus.API.Features.Letters;

/// <summary>
/// A letter's id is the only thing protecting it, so ids must never reach telemetry.
/// Replaces every letter id in request and storage addresses with "{id}".
/// </summary>
public sealed partial class LetterIdRedactor : BaseProcessor<Activity>
{
    private static readonly string[] UrlTags = ["url.path", "url.full", "http.url", "http.target"];

    public override void OnEnd(Activity activity)
    {
        activity.DisplayName = Redact(activity.DisplayName);
        foreach (var tag in UrlTags)
        {
            if (activity.GetTagItem(tag) is string value)
            {
                activity.SetTag(tag, Redact(value));
            }
        }
    }

    private static string Redact(string value) => LetterId().Replace(value, "{id}");

    // "/letter/{id}" in the site's addresses, "/letters/{id}/" in blob storage addresses
    [GeneratedRegex(@"(?<=/letters?/)[A-Za-z0-9_-]{11}(?=[/?#]|$)")]
    private static partial Regex LetterId();
}