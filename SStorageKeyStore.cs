using DataCipher;
using QStorage;
using System.Security.Cryptography;

namespace FWITD {
    /// <summary>
    /// <see cref="IKeyStore"/> for the temp-cache signing key, backed by <see cref="SStorage"/>'s
    /// generic secret storage instead of DataCipher's default <see cref="FileKeyStore"/> (DPAPI
    /// LocalMachine-scoped — per its own doc comment, decryptable by any process on the machine
    /// regardless of account). <see cref="SStorage.GetSecretAsync"/>/<see cref="SStorage.SetSecretAsync"/>
    /// already handle the platform split correctly (Keychain/Keystore/Credential Locker on MAUI, a
    /// DPAPI CurrentUser-protected file on WPF), so this store just needs to (de)serialize the RSA
    /// key pair to/from a string.
    ///
    /// This store only ever holds key pairs this app itself owns (no peer public-key pinning), so
    /// <see cref="TryGetPublicKey"/> just re-derives the public half from the private key on demand.
    /// </summary>
    internal sealed class SStorageKeyStore : IKeyStore {
        private static string PrivateKeyName(int n) => $"datacipher_privatekey_{n}";
        private static string CreatedAtName(int n) => $"datacipher_privatekey_{n}_created_utc";

        // IKeyStore's members are synchronous, but on MAUI (Android/iOS/Windows) SStorage's underlying
        // SecureStorage calls sometimes complete via a real async round-trip (Keystore/Keychain/DPAPI-NG)
        // that posts its continuation back to the UI thread's SynchronizationContext. Blocking that same
        // UI thread on GetAwaiter().GetResult() to wait for it deadlocks forever. So the two names this
        // store ever touches (see AssetLoader.TempCacheSigningKeySlot) are preloaded once, up front, via
        // a real await (see PreloadAsync) before this instance is ever handed to DataCipher.KeyManager;
        // every member below then just reads/writes this in-memory cache instead of calling SStorage
        // synchronously again. WPF's DPAPI-file-backed SStorage never needed this — it has no UI-thread
        // affinity to deadlock on — which is why the same code only ever hung on MAUI.
        private readonly Dictionary<string, string?> _cache = new();

        internal async Task PreloadAsync(int n) {
            _cache[PrivateKeyName(n)] = await SStorage.GetSecretAsync(PrivateKeyName(n));
            _cache[CreatedAtName(n)] = await SStorage.GetSecretAsync(CreatedAtName(n));
        }

        private string? CachedOrThrow(string name) =>
            _cache.TryGetValue(name, out var value)
                ? value
                : throw new InvalidOperationException($"{nameof(SStorageKeyStore)}: '{name}' was never preloaded via {nameof(PreloadAsync)}.");

        public bool Exists(int n) => CachedOrThrow(PrivateKeyName(n)) != null;

        public void SavePrivateKey(int n, RSA key) {
            byte[] pkcs8 = key.ExportPkcs8PrivateKey();
            try {
                string encoded = Convert.ToBase64String(pkcs8);
                string createdAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                SStorage.SetSecretAsync(PrivateKeyName(n), encoded).GetAwaiter().GetResult();
                SStorage.SetSecretAsync(CreatedAtName(n), createdAt).GetAwaiter().GetResult();
                _cache[PrivateKeyName(n)] = encoded;
                _cache[CreatedAtName(n)] = createdAt;
            } finally {
                CryptographicOperations.ZeroMemory(pkcs8);
            }
        }

        public void SavePublicKey(int n, RSA key) =>
            throw new NotSupportedException("SStorageKeyStore only stores key pairs owned by this app, never a pinned peer public key.");

        public bool TryGetPrivateKey(int n, out RSA? key) {
            key = null;
            var stored = CachedOrThrow(PrivateKeyName(n));
            if (stored is null) return false;
            byte[] pkcs8 = Convert.FromBase64String(stored);
            try {
                RSA rsa = RSA.Create();
                rsa.ImportPkcs8PrivateKey(pkcs8, out _);
                key = rsa;
                return true;
            } finally {
                CryptographicOperations.ZeroMemory(pkcs8);
            }
        }

        public bool TryGetPublicKey(int n, out RSA? key) {
            key = null;
            if (!TryGetPrivateKey(n, out RSA? priv) || priv is null) return false;
            using (priv) {
                RSA rsa = RSA.Create();
                rsa.ImportRSAPublicKey(priv.ExportRSAPublicKey(), out _);
                key = rsa;
                return true;
            }
        }

        public DateTimeOffset? PrivateKeyCreatedAtUtc(int n) {
            var stored = CachedOrThrow(CreatedAtName(n));
            return stored != null && long.TryParse(stored, out var unixSeconds) ? DateTimeOffset.FromUnixTimeSeconds(unixSeconds) : null;
        }
    }
}
