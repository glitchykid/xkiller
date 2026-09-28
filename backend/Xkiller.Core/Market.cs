using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;

namespace Xkiller.Core;

public static class Market
{
    public const long Step = 900_000;
    public static MarketData Create(string source, Candle[] candles, Funding[] funding)
    {
        Validate(candles);
        if (funding.Any(f => !double.IsFinite(f.Rate) || Math.Abs(f.Rate) > 1)) throw new ArgumentException("Invalid funding data.");
        var id = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new { candles, funding })))[..16];
        return new(id, source, DateTimeOffset.UtcNow, candles, funding.OrderBy(x => x.Time).ToArray());
    }
    public static void Validate(Candle[] candles)
    {
        if (candles.Length < 1600) throw new ArgumentException("At least 1600 contiguous closed 15-minute candles are required.");
        for (int i = 0; i < candles.Length; i++)
        {
            var c = candles[i];
            if (c.Minutes != 15 || c.Time % Step != 0 || c.End > DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() ||
                new[] { c.Open, c.High, c.Low, c.Close, c.Volume }.Any(x => !double.IsFinite(x)) || c.Low <= 0 || c.Volume < 0 ||
                c.High < Math.Max(c.Open, c.Close) || c.Low > Math.Min(c.Open, c.Close) || (i > 0 && c.Time != candles[i - 1].End))
                throw new ArgumentException($"Invalid, incomplete or discontinuous candle at index {i}.");
        }
    }
    public static MarketData Demo(int count = 8640)
    {
        var random = new Random(73);
        var candles = new Candle[count];
        long start = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero).ToUnixTimeMilliseconds();
        double price = 2800;
        for (int i = 0; i < count; i++)
        {
            double drift = Math.Sin(i / 180d) * 0.0005 + Math.Sin(i / 1700d) * 0.00012;
            double next = price * Math.Exp(drift + (random.NextDouble() - 0.5) * 0.009);
            double high = Math.Max(price, next) * (1 + random.NextDouble() * 0.0025);
            double low = Math.Min(price, next) * (1 - random.NextDouble() * 0.0025);
            candles[i] = new(start + i * Step, price, high, low, next, 1500 + random.NextDouble() * 7000);
            price = next;
        }
        var funding = candles.Where(c => c.Time % 28_800_000 == 0).Select(c => new Funding(c.Time, 0.0001)).ToArray();
        return Create("Synthetic demo · seed 73", candles, funding);
    }
    public static Candle[] Aggregate(Candle[] candles, int minutes)
    {
        if (minutes == 15) return candles;
        return candles.GroupBy(c => c.Time / (minutes * 60_000L)).Where(g => g.Count() == minutes / 15 && g.First().Time % (minutes * 60_000L) == 0)
            .Select(g => new Candle(g.First().Time, g.First().Open, g.Max(c => c.High), g.Min(c => c.Low), g.Last().Close, g.Sum(c => c.Volume), minutes)).ToArray();
    }
}

public sealed class BybitClient(HttpClient http)
{
    public async Task<MarketData> Download(int days, Action<int, string> progress, CancellationToken ct)
    {
        if (days is < 30 or > 360) throw new ArgumentException("Choose between 30 and 360 days.");
        long end = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() / Market.Step * Market.Step;
        long start = end - days * 96L * Market.Step;
        var candles = new SortedDictionary<long, Candle>();
        long cursor = end - 1;
        while (cursor >= start)
        {
            using var json = await Get($"/v5/market/kline?category=linear&symbol=ETHUSDT&interval=15&limit=1000&start={start}&end={cursor}", ct);
            var rows = json.RootElement.GetProperty("result").GetProperty("list");
            if (rows.GetArrayLength() == 0) break;
            long earliest = cursor;
            foreach (var row in rows.EnumerateArray())
            {
                long time = long.Parse(row[0].GetString()!, CultureInfo.InvariantCulture);
                earliest = Math.Min(time, earliest);
                if (time < start || time + Market.Step > end) continue;
                double D(int i) => double.Parse(row[i].GetString()!, CultureInfo.InvariantCulture);
                candles[time] = new(time, D(1), D(2), D(3), D(4), D(5));
            }
            if (earliest >= cursor) throw new InvalidOperationException("Bybit pagination did not advance.");
            cursor = earliest - 1;
            progress(Math.Min(85, candles.Count * 85 / (days * 96)), $"Downloaded {candles.Count:N0} candles");
            await Task.Delay(150, ct);
        }
        if (candles.Count != days * 96) throw new InvalidOperationException($"Incomplete Bybit history: received {candles.Count} of {days * 96} candles. Previous data retained.");
        var funding = new SortedDictionary<long, Funding>();
        cursor = end;
        while (cursor >= start)
        {
            using var json = await Get($"/v5/market/funding/history?category=linear&symbol=ETHUSDT&limit=200&startTime={start}&endTime={cursor}", ct);
            var rows = json.RootElement.GetProperty("result").GetProperty("list");
            if (rows.GetArrayLength() == 0) break;
            long earliest = cursor;
            foreach (var row in rows.EnumerateArray())
            {
                long time = long.Parse(row.GetProperty("fundingRateTimestamp").GetString()!, CultureInfo.InvariantCulture);
                double rate = double.Parse(row.GetProperty("fundingRate").GetString()!, CultureInfo.InvariantCulture);
                earliest = Math.Min(time, earliest);
                funding[time] = new(time, rate);
            }
            if (earliest >= cursor && rows.GetArrayLength() > 1) throw new InvalidOperationException("Funding pagination did not advance.");
            cursor = earliest - 1;
            progress(92, $"Downloaded {funding.Count} funding events");
            await Task.Delay(150, ct);
        }
        if (funding.Count == 0) throw new InvalidOperationException("No funding history returned. Import rejected to avoid omitting trading costs.");
        return Market.Create("Bybit · ETHUSDT linear perpetual", candles.Values.ToArray(), funding.Values.ToArray());
    }
    private async Task<JsonDocument> Get(string path, CancellationToken ct)
    {
        for (int attempt = 0; ; attempt++)
        {
            using var response = await http.GetAsync("https://api.bybit.com" + path, ct);
            if ((int)response.StatusCode is 429 or >= 500 && attempt < 3)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt + 1)), ct);
                continue;
            }
            response.EnsureSuccessStatusCode();
            var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            if (doc.RootElement.GetProperty("retCode").GetInt32() == 0) return doc;
            string error = doc.RootElement.GetProperty("retMsg").GetString() ?? "Unknown API error";
            doc.Dispose();
            throw new InvalidOperationException("Bybit: " + error);
        }
    }
}
