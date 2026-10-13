using Azure.Storage.Blobs;
using Azure.Identity;
using AstroClaus.API.Features.Letters;
using AstroClaus.API.Features.Letters.View;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages(options => options.RootDirectory = "/Features");

RegisterBlobStorage(builder.Services);

builder.Services.AddSingleton<ILetterStore, BlobLetterStore>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

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