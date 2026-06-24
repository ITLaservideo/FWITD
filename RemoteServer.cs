#define SERVERDEBUGGING
using System;
using System.Collections.Generic;
using System.Runtime;
using System.Text;

namespace FWITD {
    internal class RemoteServer {
#if WINDOWS && DEBUG && SERVERDEBUGGING
        internal static readonly string HttpBaseAddress = AppSettings.Get<string>("RemoteServer.HttpBaseAddressDebug", "https://localhost:7130/");
#else
        internal static readonly string HttpBaseAddress = AppSettings.Get<string>("RemoteServer.HttpBaseAddress", "http://192.168.1.217:8701");
#endif
        internal static readonly string HttpVirtualCoversAddress = AppSettings.Get<string>("RemoteServer.HttpVirtualCoversAddress", "http://192.168.1.217:16895");
        internal static readonly string HTTP_AUTH = HttpBaseAddress.TrimEnd('/') + "/User/LogIn";
    }
}
