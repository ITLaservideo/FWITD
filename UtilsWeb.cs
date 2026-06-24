using System;
using System.Data;
using System.Net;
using System.Security.Cryptography;
using System.Text;
namespace FWITD {
    internal static class UtilsWeb {
        public async static Task<string> GetIP(HttpContext context) {
            if (context.Request.Headers.TryGetValue("CF-Connecting-IP", out var cfIp)) {
#if DEBUG
                return cfIp.ToString();//omit ping clodflare
#endif
                // Cloudflare 
                if (await CloudflareCidrs.IsFromCloudflare(context)) {
                    //verify remote IP belongs to Cloudflare, then trust the header.
                    return cfIp.ToString();
                }
            }
            //if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor)) {
            //    if (await TrustedProxyCidrs.IsValid(context)) {
            //        var ip = forwardedFor.ToString().Split(',').FirstOrDefault();
            //        if (!string.IsNullOrWhiteSpace(ip))
            //            return ip.Trim();
            //    }
            //}

            IPAddress? direct_ip = context.Connection.RemoteIpAddress;
            if (direct_ip != null) {
                return direct_ip.ToString();
            }
            return context.Connection.Id;
        }
    }
}