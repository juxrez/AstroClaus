using System.Net;
using System.Net.Sockets;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace AstroClaus.API.Features.Protection;

/// <summary>
/// How much one visitor can do: a script can't flood the site, or fill storage by sending letters in a
/// loop. Over a limit, the visitor gets the error page's "Too many snowballs!" (429). The error page itself
/// is never limited, so it can always say so. One visitor is one address (<see cref="Visitor"/>).
/// </summary>
public static class RateLimits
{
    /// <summary>Every request counts: pages, scripts, pictures. One page with its files is about 15.</summary>
    public const int RequestsPerMinute = 300;

    /// <summary>Letters sent. The text check before sending (?handler=Check) saves nothing, so it doesn't count.</summary>
    public const int LettersPer10Minutes = 5;

    public static void AddRateLimits(this IServiceCollection services) => services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
            PartitionedRateLimiter.Create<HttpContext, string>(context =>
                context.Request.Path.StartsWithSegments("/error")
                    ? RateLimitPartition.GetNoLimiter("error page")
                    : RateLimitPartition.GetFixedWindowLimiter(Visitor(context), _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = RequestsPerMinute,
                        Window = TimeSpan.FromMinutes(1)
                    })),
            PartitionedRateLimiter.Create<HttpContext, string>(context =>
                IsLetterSent(context.Request)
                    ? RateLimitPartition.GetFixedWindowLimiter(Visitor(context), _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = LettersPer10Minutes,
                        Window = TimeSpan.FromMinutes(10)
                    })
                    : RateLimitPartition.GetNoLimiter("not a letter")));
    });

    /// <summary>Send on Create, in either language (Languages takes /es off the path first).</summary>
    private static bool IsLetterSent(HttpRequest request) =>
        HttpMethods.IsPost(request.Method)
        && request.Path.Equals("/write", StringComparison.OrdinalIgnoreCase)
        && !request.Query.ContainsKey("handler");

    /// <summary>
    /// The visitor's address, as Azure's front end saw it (Program.cs, forwarded headers). An IPv6 visitor
    /// counts by the first half of their address: one home or phone gets a whole block of addresses, and
    /// could otherwise take a new one for every request.
    /// </summary>
    private static string Visitor(HttpContext context)
    {
        if (context.Connection.RemoteIpAddress is not { } address) return "unknown";
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (address.AddressFamily != AddressFamily.InterNetworkV6) return address.ToString();

        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return new IPAddress(bytes) + "/64";
    }
}
