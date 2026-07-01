using System;
using System.Collections.Generic;
using System.Text;

namespace FWITD.Services {
    internal class SStorage {
        private const string DeviceIdKey = "some_device_uuid";
        private const string SessionIdKey = "some_session_uuid";
        private const string UserIdKey = "some_user_uuid";

        internal static async Task<Guid> GetOrCreateDeviceIdAsync() {
            var existingId = await SecureStorage.GetAsync(DeviceIdKey);
            if (!string.IsNullOrEmpty(existingId)) {
                return new Guid(existingId);
            }
            var newId = Guid.NewGuid();
            await SecureStorage.SetAsync(DeviceIdKey, newId.ToString());

            return newId;
        }
        internal static async Task<bool> setSessionIdAsync(Guid session_id) {
            await SecureStorage.SetAsync(SessionIdKey, session_id.ToString());
            return true;
        }
        internal static async Task<Guid> getSessionIdAsync() {
            var existingId = await SecureStorage.GetAsync(SessionIdKey);
            if (!string.IsNullOrWhiteSpace(existingId)) {
                return new Guid(existingId);
            } else {
                return Guid.Empty;
            }
        }
        internal static async Task<bool> setUserIdAsync(Int64 user_id) {
            await SecureStorage.SetAsync(UserIdKey, user_id.ToString());
            return true;
        }
        internal static async Task<Int64> getUserIdAsync() {
            var existingId = await SecureStorage.GetAsync(UserIdKey);
            if (!string.IsNullOrWhiteSpace(existingId)) {
                return Int64.Parse(existingId);
            } else {
                return -1;
            }
        }
    }
}
