using System;
using System.Collections.Generic;
using System.Text;

namespace FWITD.Controllers {
    internal class PingController {
        public object ping() {
            return new {
                message = "pong",
                timestamp = DateTime.UtcNow
            };
        }
    }
}
