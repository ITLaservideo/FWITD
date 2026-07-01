using FWITD.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
namespace FWITD.Controllers.Sicurezza {
    internal class LoginSessionController {
        private class UserSession {
            public Int64 userID { get; set; }
            public string email { get; set; }
            public Guid token { get; set; }
            public Int64 userType { get; set; }
            public string description { get; set; }
            public string timeout { get; set; }
            public string deviceId { get; set; }
            public string? fcm_token { get; set; }
            public int[] grantedActions { get; set; }
        }

        // RequestDispatcher only invokes controller methods that take no parameters or a single JsonNode.
        public async Task<object> Login(JsonNode req) {
            var nickname = req["email"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'email'");
            var password = req["pwd"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'pwd'");
            var remember_this_device = req["remember_this_device"]?.GetValue<bool>() ?? false;
            return await LoginCore(nickname, password, remember_this_device)
                ?? throw new InvalidOperationException("authentication failed");
        }

        private async Task<object?> LoginCore(string nickname, string password, bool remember_this_device = false) {
            string nick = nickname?.Trim() ?? string.Empty;
            string pwd = password?.Trim() ?? string.Empty;
#if DEBUG
            if (nickname == "auto") {
                nick = "email@me.it";
                pwd = "pwd";
            }
#endif
            if (nick.Length < 3 || nick.Length > 100)
                return null;
            if (pwd.Length < 3 || pwd.Length > 50)
                return null;
            // Convert nickname to byte string
            //nick = Convert.ToBase64String(Encoding.UTF8.GetBytes(nick));

            // Get or create deviceId
            Guid deviceId = await SStorage.GetOrCreateDeviceIdAsync();


            // Make HTTPS request
            try {
                using (HttpClient client = new HttpClient()) {
                    var payload = new Dictionary<string, string>(){
                        {"email", nick},
                        {"password", pwd },
                        {"deviceId", deviceId.ToString() },
                        {"deviceDescription", Utils.getMachineShortDescription()},
                        {"remember_this_device", remember_this_device.ToString() }
                    };
                    var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    HttpResponseMessage response = await client.PostAsync(RemoteServer.HTTP_AUTH, content);
                    if (response.IsSuccessStatusCode) {
                        string responseJson = await response.Content.ReadAsStringAsync();
                        try {
                            var profiler = JsonSerializer.Deserialize<UserSession>(responseJson);
                            if (null == profiler|| profiler.token == Guid.Empty) {
                                return null;
                            }
                            await SStorage.setSessionIdAsync(profiler.token);
                            //await SStorage.setUserIdAsync(profiler.userID);
                            if (profiler.deviceId == "waiting device authentication") {
                                profiler.email = "waiting device authentication";
                            }
                            return profiler;
                        } catch (Exception e) {

                        }
                    }
                }
            } catch (HttpRequestException e) {
                //TODO feedback offline/servers
                return null;
            } catch (TaskCanceledException e) {
                //TODO feedback il server tra poco s'impicca
                return null;
            } catch (Exception e) {
                return null;
            }

            return null;
        }
    }
}
