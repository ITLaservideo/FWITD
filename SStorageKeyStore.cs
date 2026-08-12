using DataCipher;
using QStorage;
using System.Security.Cryptography;

namespace FWITD {
    /// <summary>
    /// <see cref="IKeyStore"/> backed by <see cref="SStorage"/>'s generic secret storage instead of
    /// DataCipher's default <see cref="FileKeyStore"/> (DPAPI LocalMachine-scoped — per its own doc
    /// comment, decryptable by any process on the machine regardless of account).
    /// <see cref="SStorage.GetSecretAsync"/>/<see cref="SStorage.SetSecretAsync"/> already handle the
    /// platform split correctly (Keychain/Keystore/Credential Locker on MAUI, a DPAPI CurrentUser-
    /// protected file on WPF), so this store just needs to (de)serialize RSA key material to/from a
    /// string. Holds both key pairs this app owns (private + public) and, for
    /// <see cref="SavePublicKey"/>, a peer's pinned public key with no matching private half.
    /// </summary>
    internal sealed class SStorageKeyStore : IKeyStore {
        private static string PrivateKeyName(int n) => $"datacipher_privatekey_{n}";
        private static string PublicKeyName(int n) => $"datacipher_publickey_{n}";
        private static string CreatedAtName(int n) => $"datacipher_privatekey_{n}_created_utc";

        // IKeyStore's members are synchronous, but on MAUI (Android/iOS/Windows) SStorage's underlying
        // SecureStorage calls sometimes complete via a real async round-trip (Keystore/Keychain/DPAPI-NG)
        // that posts its continuation back to the UI thread's SynchronizationContext. Blocking that same
        // UI thread on GetAwaiter().GetResult() to wait for it deadlocks forever. So every slot this store
        // touches is preloaded once, up front, via a real await (see PreloadAsync/EnsureReadyAsync) before
        // it's ever handed to DataCipher.KeyManager; every member below then just reads/writes this
        // in-memory cache instead of calling SStorage synchronously again. WPF's DPAPI-file-backed
        // SStorage never needed this — it has no UI-thread affinity to deadlock on — which is why the
        // same code only ever hung on MAUI.
        private readonly Dictionary<string, string?> _cache = new();
        private readonly HashSet<int> _preloadedSlots = new();

        internal async Task PreloadAsync(int n) {
            _cache[PrivateKeyName(n)] = await SStorage.GetSecretAsync(PrivateKeyName(n));
            _cache[PublicKeyName(n)] = await SStorage.GetSecretAsync(PublicKeyName(n));
            _cache[CreatedAtName(n)] = await SStorage.GetSecretAsync(CreatedAtName(n));
            lock (_preloadedSlots) _preloadedSlots.Add(n);
        }

        private bool IsPreloaded(int n) {
            lock (_preloadedSlots) return _preloadedSlots.Contains(n);
        }

        private string? CachedOrThrow(string name) =>
            _cache.TryGetValue(name, out var value)
                ? value
                : throw new InvalidOperationException($"{nameof(SStorageKeyStore)}: '{name}' was never preloaded via {nameof(PreloadAsync)}.");

        public bool Exists(int n) => CachedOrThrow(PrivateKeyName(n)) != null || CachedOrThrow(PublicKeyName(n)) != null;

        public void SavePrivateKey(int n, RSA key) {
            byte[] pkcs8 = key.ExportPkcs8PrivateKey();
            try {
                string encoded = Convert.ToBase64String(pkcs8);
                string publicPem = key.ExportSubjectPublicKeyInfoPem();
                string createdAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                SStorage.SetSecretAsync(PrivateKeyName(n), encoded).GetAwaiter().GetResult();
                SStorage.SetSecretAsync(PublicKeyName(n), publicPem).GetAwaiter().GetResult();
                SStorage.SetSecretAsync(CreatedAtName(n), createdAt).GetAwaiter().GetResult();
                _cache[PrivateKeyName(n)] = encoded;
                _cache[PublicKeyName(n)] = publicPem;
                _cache[CreatedAtName(n)] = createdAt;
            } finally {
                CryptographicOperations.ZeroMemory(pkcs8);
            }
        }

        public void SavePublicKey(int n, RSA key) {
            string publicPem = key.ExportSubjectPublicKeyInfoPem();
            SStorage.SetSecretAsync(PublicKeyName(n), publicPem).GetAwaiter().GetResult();
            _cache[PublicKeyName(n)] = publicPem;
        }

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
            var storedPublic = CachedOrThrow(PublicKeyName(n));
            if (storedPublic != null) {
                RSA rsa = RSA.Create();
                rsa.ImportFromPem(storedPublic);
                key = rsa;
                return true;
            }
            // Falls back to re-deriving from the private key for slots saved before PublicKeyName
            // existed (SavePrivateKey now stores the public PEM alongside it, mirroring FileKeyStore).
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

        private static SStorageKeyStore? _shared;
        private static readonly SemaphoreSlim _sharedInitLock = new(1, 1);

        /// <summary>
        /// Returns the single app-wide <see cref="SStorageKeyStore"/>, installed as
        /// <see cref="KeyManager.Store"/> on first use, with every slot in <paramref name="slots"/>
        /// preloaded (a no-op for slots an earlier call already preloaded). Every caller that touches
        /// <see cref="KeyManager"/> for a given slot must route through here first — <see cref="IKeyStore"/>'s
        /// members are synchronous, so nothing else gets a chance to await the underlying secure-storage read.
        /// </summary>
        internal static async Task<SStorageKeyStore> EnsureReadyAsync(params int[] slots) {
            if (_shared is null) {
                await _sharedInitLock.WaitAsync();
                try {
                    _shared ??= new SStorageKeyStore();
                    KeyManager.Store = _shared;
                } finally {
                    _sharedInitLock.Release();
                }
            }
            foreach (var n in slots) {
                if (IsPreloadedShared(n)) continue;
                await _sharedInitLock.WaitAsync();
                try {
                    if (!IsPreloadedShared(n)) {
                        await _shared.PreloadAsync(n);
                    }
                } finally {
                    _sharedInitLock.Release();
                }
            }
            return _shared;

            static bool IsPreloadedShared(int n) => _shared!.IsPreloaded(n);
        }
    }
}
