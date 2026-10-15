using Azure.Storage.Blobs;
using Azure.Identity;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.View;
using OpenTelemetry.Trace;
using Azure.Monitor.OpenTelemetry.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages(options => options.RootDirectory = "/Features");
RegisterAppInsight(builder);
RegisterBlobStorage(builder.Services);


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

app.Run();


void RegisterBlobStorage(IServiceCollection services)
{
    var endpoint = builder.Configuration["Blobs:Endpoint"] 
        ?? throw new InvalidOperationException("Missing account URL for blob storage");

    var credential = builder.Environment.IsDevelopment()
        ? new DefaultAzureCredential(new DefaultAzureCredentialOptions
        {
            ExcludeManagedIdentityCredential = true,
            TenantId = builder.Configuration["Blobs:TenantId"]
        })
        : new DefaultAzureCredential();

    builder.Services.AddSingleton(new BlobServiceClient(new Uri(endpoint), credential));
}


void RegisterAppInsight(WebApplicationBuilder builder)
{
    var connectionString = builder.Configuration["AzureMonitor:ConnectionString"];

    if(builder.Environment.IsProduction() && !string.IsNullOrEmpty(connectionString))
    {
        builder.Services.ConfigureOpenTelemetryTracerProvider(tracing =>
            tracing.AddProcessor(new LetterIdRedactor()));

        builder.Services.AddOpenTelemetry().UseAzureMonitor();
    }
}