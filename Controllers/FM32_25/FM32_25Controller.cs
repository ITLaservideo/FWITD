using QStorage;
using FM32_25;
using FM32_25.WebViewUi;
using System;
using System.Collections.Generic;
using System.IO.Ports;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using static FM32_25.MRZParser;
namespace FWITD.Controllers.FM32_25 {
    internal class FM32_25Controller {
        public static readonly FM3281 the_instance = new FM3281(false);

        static FM32_25Controller() {
            // FM32_25 is a standalone library with no WPF/WebView2 reference; it raises these
            // neutral events instead of touching Ui/Log directly, so bridge them here once.
            ReaderLog.OnStatus += (msg, level) => Ui.log(msg, (Ui.TypeLog)(int)level);
            ReaderLog.OnDebug += msg => Log.log(msg);
            ReaderLog.OnNotify += Ui.callApp;
        }
        public object ListPorts() {
            return SerialPort.GetPortNames();
        }

        public object OpenPort(JsonNode req) {
            var port_name = req["port_name"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'port_name'");
            if (the_instance.Init(port_name)) {
                return new { CurrentStatus = "port open" };
            }
            return new { CurrentStatus = "port closed", error = port_name };
        }
        public object ClosePort() {
            FM3281.ClosePort();
            return new { CurrentStatus = "port closed" };
        }
        public object Beep() {
            _ = FM3281.SendCommandAsync("BEEPON2000F50T15V");
            return new {/* res = FM3281.test(0)*/ };
        }
        public object StopCard() {
            FM3281.stopCard();
            return new { ok = true };
        }
        public object EnableBusinessMode() {
            the_instance.enableBusinessMode();
            return new { ok = true };
        }
        public async Task<FMInfo> GetSystemInfo() {
            var ss = await FM3281.GetSystemInfo();
            return ss;
        }
        public object ListenForMifare1kCard() {
            FM3281.listenForMifare1kCard(true);
            return new { ok = true };
        }
        public object ReadCardMrz(JsonNode req) {
            var mrz = SQL.ToString(req["mrz"]?.GetValue<string>() ?? "0");
            the_instance.ReadCardMrz(mrz);
            return new { ok = true };
        }
        public object ListenIdentityCards() {
            the_instance.ReadCardMrz();
            return new { ok = true };
        }
        //public object AuthenticateMifareClassic1k() {
        //    FM3281.authenticateMifareClassic1k();
        //    return new { ok = true };
        //}
        //public object LogDRLog() {
        //    the_instance.logDRLog();
        //    return new { ok = true };
        //}
        public object WriteMifare1kCards(JsonNode req) {
            var tag = req["tag"]?.GetValue<string>() ?? "";
            var from = SQL.ToInt32(req["from_include"]?.GetValue<string>() ?? "0");
            var to = SQL.ToInt32(req["to_include"]?.GetValue<string>() ?? "500");
            FM3281.listenForMifare1kCard();
            MifareClassic1k.writeIDSCards(tag, from, to, true);
            return new { ok = true };
        }
        public object WriteMifare1kCardsCancel() {
            MifareClassic1k.writeIDSCardsCancel();
            return new { ok = true };
        }
        public async Task<object> SendRawCommand(JsonNode req) {
            string command = (req["command"]?.GetValue<string>() ?? "");
            bool permanent_setting = (req["permanent_setting"]?.GetValue<bool>() ?? false);//aka prefix @ by default or #
            var ss = await FM3281.SendCommandAsync(command, permanent_setting: permanent_setting);
            Ui.log(ss.the_response, Ui.TypeLog.info);
            return new { ok = true };
        }
        public object WriteDataCommand(JsonNode req) {
            string what = (req["what"]?.GetValue<string>() ?? "");
            MifareClassic1k.overWriteDataNextCard(new MifareClassic1k.OverWrite() {
                data = what,
                onComplete = () => {
                    FM3281.listenForMifare1kCard();
                }
            });
            return new { ok = true };
        }
        public object ChangePasswordToCommand(JsonNode req) {
            string what = (req["what"]?.GetValue<string>() ?? "").ToUpper();
            if (what.Length == 12 && Regex.IsMatch(what, "^[A-F0-9]+$")) {
                MifareClassic1k.changePasswordNextCard(what);
            } else {
                Ui.log("reset mifare 1k password to default+", Ui.TypeLog.warn);
                MifareClassic1k.changePasswordNextCard();
            }
            return new { ok = true };
        }
        public object TestMRZInput(JsonNode req) {
            string what = (req["what"]?.GetValue<string>() ?? "");
            string[] lines = what.Replace("\r", "").Split('\n');
            bool isBatch = lines.Length > 1;
            if (isBatch) {
                List<MRZInfo> res = new List<MRZInfo>();
                foreach (string line in lines) {
                    var tadd = (parseOneMRZ(line));
                    if (tadd != null) {
                        res.Add(tadd);
                    }
                }
                return new { ok = true, res = res };
            }
            return new { ok = true, res = new List<MRZInfo>() { parseOneMRZ(what) } };
        }
        #region services
        private static readonly Regex timestampPrefixRegex = new Regex(@"^[0-9]{4}.[0-9]{2}.[0-9]{2}.[0-9]{2}.[0-9]{2}.[0-9]{2} ");
        private static readonly Regex timestampPrefixRegexIta = new Regex(@"^[0-9]{2}.[0-9]{2}.[0-9]{4}.[0-9]{2}.[0-9]{2}.[0-9]{2} ");
        private MRZInfo parseOneMRZ(string what) {
            string MRZreading = what;
            MRZInfo mRZInfo = new MRZInfo();
            Match timestampMatch = timestampPrefixRegex.Match(MRZreading);
            if (timestampMatch.Success) {
                MRZreading = MRZreading.Substring(timestampMatch.Length);
            } else {
                timestampMatch = timestampPrefixRegexIta.Match(MRZreading);
                if (timestampMatch.Success) {
                    MRZreading = MRZreading.Substring(timestampMatch.Length);
                }
            }
            MRZreading = MRZreading.Trim();
            if (string.IsNullOrWhiteSpace(MRZreading)) {
                return null;
            }
            try {
                if (MRZreading.Length % 88 == 0) {//passport multiple lines read
                    MRZreading = MRZreading.Substring(0, 88);
                } else if (MRZreading.Length % 90 == 0) { //id multiple times read
                    MRZreading = MRZreading.Substring(0, 90);
                }
                mRZInfo = MRZParser.ParseTD3(MRZreading);
                Ui.log($"accepted:{what}", Ui.TypeLog.success);
            } catch (MRZParsingError err) {
                Ui.log($"waiting good read, rejected:{what}", Ui.TypeLog.warn);
            }
            if (mRZInfo.fullMRZ == null) {
                mRZInfo.fullMRZ = MRZreading;
            }
            if (timestampMatch.Success) {
                mRZInfo.timestamp = timestampMatch.Value.Trim();
            }
            return mRZInfo;
        }
        #endregion
    }
}
