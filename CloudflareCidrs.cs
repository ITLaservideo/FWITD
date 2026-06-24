using System.Net;

namespace FWITD {
    public static class CloudflareCidrs {
        private static List<(IPAddress Base, int Prefix)> _cidrs = new();
        private static DateTime _lastUpdate = DateTime.MinValue;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(12);
        private static readonly SemaphoreSlim _lock = new(1, 1);
        private static readonly HttpClient _http = new HttpClient {
            Timeout = TimeSpan.FromSeconds(10)
        };

        public static async Task<bool> IsFromCloudflare(HttpContext context) {
            var remoteIp = context.Connection.RemoteIpAddress;
            if (remoteIp == null)
                return false;

            await EnsureCidrsAsync();
            return _cidrs.Any(c => IsInSubnet(remoteIp, c.Base, c.Prefix));
        }

        private static async Task EnsureCidrsAsync() {
            if (DateTime.UtcNow - _lastUpdate < CacheDuration && _cidrs.Count > 0)
                return;

            await _lock.WaitAsync();
            try {
                if (DateTime.UtcNow - _lastUpdate < CacheDuration && _cidrs.Count > 0)
                    return;

                var v4 = await _http.GetStringAsync("https://www.cloudflare.com/ips-v4");
                var v6 = await _http.GetStringAsync("https://www.cloudflare.com/ips-v6");

                _cidrs = v4.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Concat(v6.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                    .Select(ParseCidr)
                    .ToList();

                _lastUpdate = DateTime.UtcNow;
            } catch { } finally {
                _lock.Release();
            }
        }

        private static (IPAddress Base, int Prefix) ParseCidr(string cidr) {
            var parts = cidr.Trim().Split('/');
            return (IPAddress.Parse(parts[0]), int.Parse(parts[1]));
        }

        private static bool IsInSubnet(IPAddress address, IPAddress baseAddress, int prefixLength) {
            if (address.AddressFamily != baseAddress.AddressFamily)
                return false;

            var addressBytes = address.GetAddressBytes();
            var baseBytes = baseAddress.GetAddressBytes();

            int fullBytes = prefixLength / 8;
            int remainingBits = prefixLength % 8;

            for (int i = 0; i < fullBytes; i++) {
                if (addressBytes[i] != baseBytes[i])
                    return false;
            }

            if (remainingBits > 0) {
                int mask = (byte)~(255 >> remainingBits);
                if ((addressBytes[fullBytes] & mask) != (baseBytes[fullBytes] & mask))
                    return false;
            }

            return true;
        }
    }
}
