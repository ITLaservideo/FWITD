using DataCipher;
using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    /// <summary>
    /// Backs the InstallationSecureMessaging wizard
    /// (ClientApp/apps_standalone_components/InstallationSecureMessaging): creates/inspects this
    /// machine's own <see cref="SecureMessaging"/> key pair and pins a peer's public key, per
    /// LIBS/DataCipher/SecureMessageReadme.md. "Role" is only UI framing for which readme steps to
    /// show — the actual <see cref="KeyManager"/> calls only ever care about the two slot numbers,
    /// which the two sides agree on out of band (readme section 1) and enter here.
    /// </summary>
    public class InstallationSecureMessagingController {
        private const string RoleKey = "SecureMessaging.Role";
        private const string OwnSlotKey = "SecureMessaging.OwnSlot";
        private const string PeerSlotKey = "SecureMessaging.PeerSlot";
        // DataCipher itself has no opinion on rotation cadence (see the readme's forward-secrecy
        // section) - this is just what Status() uses to nudge the wizard's UI.
        private static readonly TimeSpan RecommendedMaxKeyAge = TimeSpan.FromDays(90);

        public async Task<object> Status() {
            string? role = QStorage.UserSettings.Get<string?>(RoleKey, null);
            int ownSlot = QStorage.UserSettings.Get(OwnSlotKey, 0);
            int peerSlot = QStorage.UserSettings.Get(PeerSlotKey, 0);

            int[] slots = new[] { ownSlot, peerSlot }.Where(s => s != 0).ToArray();
            if (slots.Length > 0) {
                await SStorageKeyStore.EnsureReadyAsync(slots);
            }

            TimeSpan? ownKeyAge = ownSlot != 0 ? KeyManager.PrivateKeyAge(ownSlot) : null;

            return new {
                role,
                ownSlot = ownSlot == 0 ? (int?)null : ownSlot,
                peerSlot = peerSlot == 0 ? (int?)null : peerSlot,
                ownKeyExists = ownKeyAge != null,
                ownKeyAgeDays = ownKeyAge?.TotalDays,
                ownKeyShouldRotate = ownSlot != 0 && KeyManager.ShouldRotate(ownSlot, RecommendedMaxKeyAge),
                ownPublicKeyPem = ownSlot != 0 ? KeyManager.GetPublicKey(ownSlot) : null,
                peerKeyImported = peerSlot != 0 && KeyManager.GetPublicKey(peerSlot) != null,
            };
        }

        public async Task<object> SaveConfig(JsonNode req) {
            string role = req["role"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'role'");
            int ownSlot = req["ownSlot"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'ownSlot'");
            int peerSlot = req["peerSlot"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'peerSlot'");
            SharedIdentitySlot.Require(ownSlot);
            SharedIdentitySlot.Require(peerSlot);
            if (ownSlot == peerSlot) {
                throw new ArgumentException("ownSlot and peerSlot must be different slots.");
            }

            QStorage.UserSettings.Set(RoleKey, role);
            QStorage.UserSettings.Set(OwnSlotKey, ownSlot);
            QStorage.UserSettings.Set(PeerSlotKey, peerSlot);

            return await Status();
        }

        public async Task<object> CreateOwnKey() {
            int ownSlot = QStorage.UserSettings.Get(OwnSlotKey, 0);
            if (ownSlot == 0) {
                throw new InvalidOperationException("Save the slot configuration first.");
            }
            await SStorageKeyStore.EnsureReadyAsync(ownSlot);

            int? created = KeyManager.CreatePrivateKey(ownSlot);
            return new {
                created = created != null,
                publicKeyPem = KeyManager.GetPublicKey(ownSlot),
            };
        }

        public async Task<object> ImportPeerKey(JsonNode req) {
            string pem = req["pem"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'pem'");
            int peerSlot = QStorage.UserSettings.Get(PeerSlotKey, 0);
            if (peerSlot == 0) {
                throw new InvalidOperationException("Save the slot configuration first.");
            }
            await SStorageKeyStore.EnsureReadyAsync(peerSlot);

            bool ok = KeyManager.ImportPublicKey(peerSlot, pem.Trim());
            return new { ok };
        }
    }
}
