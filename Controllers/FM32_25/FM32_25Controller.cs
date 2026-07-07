using DotNet.Utility;
using FM3281Reader;
using FWShellWPF.FM32_25;
using System;
using System.Collections.Generic;
using System.IO.Ports;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using static FM3281Reader.MRZParser;
namespace FWITD.Controllers.FM32_25 {
    internal class FM32_25Controller {
        static readonly FM3281 the_instance = new FM3281(true);
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
            if (FM3281._serialPort != null && FM3281._serialPort.IsOpen) {
                FM3281._serialPort.Close();
            }
            return new { CurrentStatus = "port closed" };
        }
        public object Beep() {
            FM3281.sendCommand(new CommandBuilder() { command = new Command() { command = "BEEPON2000F50T15V" } });
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
        //public object ReadCIEAUS(JsonNode req) {
        //    var which = SQL.ToInt32(req["which"]?.GetValue<string>() ?? "0");
        //    //the_instance.readCIEAUS(which);
        //    return new { ok = true };
        //}
        //public object GetQuickTestNFCCards() {
        //    return FM3281.GetQuickTestNFCCards();
        //}
        public object ListenIdentityCards() {
            the_instance.ReadCardMrz();
            return new { ok = true };
        }
        public object AuthenticateMifareClassic1k() {
            FM3281.authenticateMifareClassic1k();
            return new { ok = true };
        }
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
        public object SendRawCommand(JsonNode req) {
            string command = (req["command"]?.GetValue<string>() ?? "");
            bool permanent_setting = (req["permanent_setting"]?.GetValue<bool>() ?? false);//aka prefix @ by default or #
            FM3281.sendCommand(new CommandBuilder() { command = new Command() { command = command, permanent_setting = permanent_setting } });
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
                foreach (string line in lines) {
                    if (line.Length < 88) {
                        isBatch = false;
                        break;
                    }
                }
            }
            if (isBatch) {
                List<MRZInfo> res = new List<MRZInfo>();
                foreach (string line in lines) {
                    res.Add(parseOneMRZ(line));
                }
                return new { ok = true, res = res };
            }
            return new { ok = true, res = parseOneMRZ(what) };
        }
        #region services
        private MRZInfo parseOneMRZ(string what) {
            string MRZreading = what;
            MRZInfo mRZInfo = new MRZInfo();
            try {
                MRZreading = MRZreading.Trim();
                if (MRZreading.Length % 88 == 0) {//passport multiple lines read
                    MRZreading = MRZreading.Substring(0, 88);
                } else if (MRZreading.Length % 90 == 0) { //id multiple times read
                    MRZreading = MRZreading.Substring(0, 90);
                }
                mRZInfo = MRZParser.ParseTD3(MRZreading);
                Ui.log($"accepted:{what}", Ui.TypeLog.success);
            } catch (MRZParsingError err) {
                Ui.log($"waiting good read, rejected:{what}", Ui.TypeLog.warn);
                //waiting good read
                //WriteLog("ReadCardMrz: MRZ is NOT ok, try again...");
            }
            if (mRZInfo.fullMRZ == null) {
                mRZInfo.fullMRZ = what;
            }
            return mRZInfo;
        }
        #endregion
    }
}
