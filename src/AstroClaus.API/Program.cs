using Azure.Storage.Blobs;
using Azure.Identity;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.View;
using AstroClaus.API.Features.Seo;
using OpenTelemetry.Trace;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using AstroClaus.API.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages(options => options.RootDirectory = "/Features");
builder.RegisterAppInsight();
builder.RegisterBlobStorage();

builder.Services.AddSingleton<ILetterStore, BlobLetterStore>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// Error responses without a body of their own (a 404 for an unknown address, for example) show
// the friendly error page, keeping their status code. Pages that write their own body keep it.
app.UseStatusCodePagesWithReExecute("/error/{0}");

app.UseHttpsRedirection();
app.UseRouting();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();
app.MapLetterImages();
app.MapSeo();

app.Run();

