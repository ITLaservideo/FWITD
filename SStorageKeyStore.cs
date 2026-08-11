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

        public bool Exists(int n) => SStorage.GetSecretAsync(PrivateKeyName(n)).GetAwaiter().GetResult() != null;

        public void SavePrivateKey(int n, RSA key) {
            byte[] pkcs8 = key.ExportPkcs8PrivateKey();
            try {
                SStorage.SetSecretAsync(PrivateKeyName(n), Convert.ToBase64String(pkcs8)).GetAwaiter().GetResult();
                SStorage.SetSecretAsync(CreatedAtName(n), DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()).GetAwaiter().GetResult();
            } finally {
                CryptographicOperations.ZeroMemory(pkcs8);
            }
        }

        public void SavePublicKey(int n, RSA key) =>
            throw new NotSupportedException("SStorageKeyStore only stores key pairs owned by this app, never a pinned peer public key.");

        public bool TryGetPrivateKey(int n, out RSA? key) {
            key = null;
            var stored = SStorage.GetSecretAsync(PrivateKeyName(n)).GetAwaiter().GetResult();
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
            var stored = SStorage.GetSecretAsync(CreatedAtName(n)).GetAwaiter().GetResult();
            return stored != null && long.TryParse(stored, out var unixSeconds) ? DateTimeOffset.FromUnixTimeSeconds(unixSeconds) : null;
        }
    }
}
