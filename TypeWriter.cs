using System.Runtime.InteropServices;
using System.Threading;

namespace FWITD {
    internal class TypeWriter {
        [DllImport("user32.dll")]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        static extern short VkKeyScan(char ch);

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT {
            public uint type;
            public INPUTUNION u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct INPUTUNION {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT {
            public int dx, dy, mouseData, dwFlags, time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;

        public static void SimulateKeyboardInput(string text, int delayMs = 0) {
            foreach (char c in text) {
                SendChar(c);
                if (delayMs > 0) Thread.Sleep(delayMs);
            }
        }

        public static void SimulateKeyPress(ushort virtualKey) {
            INPUT[] inputs = new INPUT[2];

            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = virtualKey;
            inputs[0].u.ki.dwFlags = 0;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = virtualKey;
            inputs[1].u.ki.dwFlags = KEYEVENTF_KEYUP;

            _ = SendInput(2, inputs, Marshal.SizeOf<INPUT>());
        }

        public static void DeleteAll() {
            INPUT[] inputs = new INPUT[4];

            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = 0xA2; // VK_LCONTROL down

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wVk = 0x41; // VK_A down

            inputs[2].type = INPUT_KEYBOARD;
            inputs[2].u.ki.wVk = 0x41; // VK_A up
            inputs[2].u.ki.dwFlags = KEYEVENTF_KEYUP;

            inputs[3].type = INPUT_KEYBOARD;
            inputs[3].u.ki.wVk = 0xA2; // VK_LCONTROL up
            inputs[3].u.ki.dwFlags = KEYEVENTF_KEYUP;

            _ = SendInput(4, inputs, Marshal.SizeOf<INPUT>());
            Thread.Sleep(100);
            SimulateKeyPress(0x2E); // VK_DELETE
        }

        private static void SendChar(char c) {
            INPUT[] inputs = new INPUT[2];

            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wScan = c;
            inputs[0].u.ki.dwFlags = KEYEVENTF_UNICODE;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].u.ki.wScan = c;
            inputs[1].u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;

            _ = SendInput(2, inputs, Marshal.SizeOf<INPUT>());
        }
    }
}
