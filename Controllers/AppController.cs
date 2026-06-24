using System;
using System.Collections.Generic;
using System.Text;

namespace FWITD.Controllers {
    internal class AppController {
        public object CloseApp() {
            return new {
                ForSure = true
            };
        }
    }
}
