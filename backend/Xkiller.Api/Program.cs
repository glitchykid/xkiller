using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Xkiller.Api;
using Xkiller.Core;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
string token = Environment.GetEnvironmentVariable("XKILLER_TOKEN") ?? throw new InvalidOperationException("XKILLER_TOKEN is required.");
if (token.Length < 32) throw new InvalidOperationException("Use a random token of at least 32 characters.");
int port = int.TryParse(Environment.GetEnvironmentVariable("XKILLER_PORT"), out var configured) ? configured : 0;
builder.WebHost.ConfigureKestrel(server => { server.Listen(System.Net.IPAddress.Loopback, port); server.Limits.MaxRequestBodySize = 16_384; });
builder.Services.AddSingleton(new BybitClient(new HttpClient { Timeout = TimeSpan.FromSeconds(30) }));
builder.Services.AddSingleton<Lab>();
var app = builder.Build();
_ = app.Services.GetRequiredService<Lab>();
app.Use(async (context, next) =>
{
    string supplied = context.Request.Headers["X-Xkiller-Token"].ToString();
    if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(token)))
    { context.Response.StatusCode = 401; return; }
    try { await next(context); }
    catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
    { context.Response.StatusCode = ex is ArgumentException ? 400 : 409; await context.Response.WriteAsJsonAsync(new { error = ex.Message }); }
});
app.MapGet("/api/state", (Lab lab) => lab.Snapshot());
app.MapPost("/api/import", (ImportRequest request, Lab lab) => { if (request.Days is < 30 or > 360) throw new ArgumentException("Choose 30–360 days."); return Results.Accepted(value: lab.Import(request.Days)); });
app.MapPost("/api/demo", (Lab lab) => Results.Accepted(value: lab.Demo()));
app.MapPost("/api/train", (TrainingOptions options, Lab lab) => Results.Accepted(value: lab.Train(options)));
app.MapPost("/api/simulate", (RiskOptions risk, Lab lab) => Results.Accepted(value: lab.Simulate(risk)));
app.MapPost("/api/cancel", (Lab lab) => { lab.Cancel(); return Results.Ok(new { ok = true }); });
app.MapGet("/api/export/{kind}", (string kind, Lab lab) => lab.Export(kind));
app.Lifetime.ApplicationStarted.Register(() => Console.WriteLine("XKILLER_READY " + app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First()));
if (int.TryParse(Environment.GetEnvironmentVariable("XKILLER_PARENT_PID"), out var parentId))
{
    _ = Task.Run(async () =>
    {
        while (!app.Lifetime.ApplicationStopping.IsCancellationRequested)
        {
            try { using var parent = System.Diagnostics.Process.GetProcessById(parentId); if (parent.HasExited) break; }
            catch (ArgumentException) { break; }
            await Task.Delay(2000);
        }
        app.Lifetime.StopApplication();
    });
}
await app.RunAsync();
internal sealed record ImportRequest(int Days);
