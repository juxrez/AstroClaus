using Azure.Storage.Blobs;
using Azure.Identity;
using AstroClaus.API.Features.Language;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.View;
using AstroClaus.API.Features.Protection;
using AstroClaus.API.Features.Seo;
using AstroClaus.API.Features.Shared;
using Microsoft.AspNetCore.HttpOverrides;
using OpenTelemetry.Trace;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using AstroClaus.API.Extensions;

var builder = WebApplication.CreateBuilder(args);

// The site's words in Spanish live in Features/Shared/SiteText.es.resx; the English is the key.
builder.Services.AddLocalization();
builder.Services.AddRazorPages(options => options.RootDirectory = "/Features")
    .AddDataAnnotationsLocalization(options => options.DataAnnotationLocalizerProvider = (_, factory) => factory.Create(typeof(SiteText)));
builder.RegisterAppInsight();
builder.RegisterBlobStorage();

// The visitor's address and https, as Azure's front end received them. It adds the visitor's address
// last in X-Forwarded-For, and anything before it can be faked by the visitor, so only the last one is
// read. The front end's own address isn't fixed, so any is trusted. Only the hosts in AllowedHosts
// (appsettings.json) are answered at all.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddRateLimits();

builder.Services.AddSingleton<ILetterStore, BlobLetterStore>();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseOneHost();
app.UseSafetyHeaders();
app.UseLanguages();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// Error responses without a body of their own (a 404 for an unknown address, or a visitor over a
// rate limit) show the friendly error page, keeping their status code. Pages that write their own body keep it.
app.UseStatusCodePagesWithReExecute("/error/{0}");

app.UseHttpsRedirection();
app.UseRouting();
app.UseRateLimiter();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();
app.MapLetterImages();
app.MapSeo();

app.Run();
