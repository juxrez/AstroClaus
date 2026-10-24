using AstroClaus.API.Features.Letters;
using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Azure.Storage.Blobs;
using OpenTelemetry.Trace;

namespace AstroClaus.API.Extensions
{
    public static class ServiceCollectionExtensions
    {
        internal static void RegisterBlobStorage(this WebApplicationBuilder builder)
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

        internal static void RegisterAppInsight(this WebApplicationBuilder builder)
        {
            var connectionString = builder.Configuration["AzureMonitor:ConnectionString"];

            if (builder.Environment.IsProduction() && !string.IsNullOrEmpty(connectionString))
            {
                builder.Services.ConfigureOpenTelemetryTracerProvider(tracing =>
                    tracing.AddProcessor(new LetterIdRedactor()));

                builder.Services.AddOpenTelemetry().UseAzureMonitor();
            }
        }
    }
}
