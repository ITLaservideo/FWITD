using Microsoft.Web.WebView2.Wpf;
using System.Runtime.InteropServices;
using System.Windows;

namespace FWITD {
    internal class MouseClicker {
        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

        private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const uint MOUSEEVENTF_LEFTUP = 0x0004;

        public static void ClickAt(int x, int y, WebView2 webView) {
            Point screenPoint = webView.PointToScreen(new Point(x, y));
            SetCursorPos((int)screenPoint.X, (int)screenPoint.Y);
            mouse_event(MOUSEEVENTF_LEFTDOWN, (uint)screenPoint.X, (uint)screenPoint.Y, 0, UIntPtr.Zero);
            mouse_event(MOUSEEVENTF_LEFTUP, (uint)screenPoint.X, (uint)screenPoint.Y, 0, UIntPtr.Zero);
        }

        public static void MoveMouseAt(int x, int y, WebView2 webView) {
            Point screenPoint = webView.PointToScreen(new Point(x, y));
            SetCursorPos((int)screenPoint.X, (int)screenPoint.Y);
        }
    }
}
