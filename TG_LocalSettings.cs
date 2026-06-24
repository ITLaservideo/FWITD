using DotNet.Utility;
using System.Data;
namespace FWITD {
    public static class TG_LocalSettings {
        private static readonly object _lock = new();
        private static readonly Dictionary<string, object?> _cache = new();
        private static DataTable _cache_dt = new DataTable();

        /// <summary>
        /// Retrieves a typed configuration value from the database-backed settings table. <br></br>
        /// Values are cached in memory after the first read. Subsequent calls return the
        /// cached value unless the cache is cleared.
        /// </summary>
        /// <typeparam name="T">
        /// The expected return type. Supported types include: <br></br>
        /// <c>bool</c>, <c>int</c>, <c>string</c>, <c>DateTime</c>, <c>Guid</c>,
        /// <c>int[]</c> (CSV), and <c>string[]</c> (CSV).
        /// </typeparam>
        /// <param name="key">The setting name stored in the <c>TG_LocalSettings</c> table.</param>
        /// <param name="defaultValue">The value returned if the setting does not exist or cannot be converted.</param>
        /// <returns>The typed setting value.</returns>
        public static T Get<T>(string key, T defaultValue = default!) {
            lock (_lock) {
                if (_cache.TryGetValue(key, out var cached))
                    return (T)cached!;
                if (_cache_dt.Rows.Count == 0) {
                    _cache_dt = SQL.ExecuteQuery("SELECT * FROM TG_LocalSettings");
                }
                object raw = DBNull.Value;
                DataRow? found = (_cache_dt).Rows.Cast<DataRow>().FirstOrDefault(r => r["Nome"] is string s && s == key);
                if (found != null) {
                    raw = found["Valore"];
                }

                T typed = ConvertTo<T>(raw, defaultValue);
                _cache[key] = typed!;
                return typed!;
            }
        }

        /// <summary>
        /// Updates a configuration value in the database and refreshes the in-memory cache.
        /// If the setting does not exist, it is inserted.
        /// </summary>
        /// <typeparam name="T">The type of the value being stored.</typeparam>
        /// <param name="key">The setting name.</param>
        /// <param name="value">The new value to store.</param>
        public static bool Set<T>(string key, T value) {
            lock (_lock) {
                object serialized = SerializeValue(value);
                int updated = SQL.ExecuteNonQuery("UPDATE TG_LocalSettings SET Valore=@0 WHERE Nome=@1;", [serialized, key]);
                if (updated == 0) {
                    updated = SQL.ExecuteNonQuery("INSERT INTO TG_LocalSettings (Valore, Nome) VALUES(@0, @1);", [serialized, key]);
                }
                if (updated >= 1) {
                    _cache[key] = value!;
                    return true;
                }
                return false;
            }
        }

        /// <summary>
        /// Clears all cached settings, forcing the next <see cref="Get{T}"/> call to reload
        /// values from the database.
        /// </summary>
        public static void ClearCache() {
            lock (_lock) {
                _cache.Clear();
                _cache_dt.Clear();
            }
        }

        /// <summary>
        /// Converts a raw database value into the requested type <typeparamref name="T"/>.
        /// Supports primitive types, GUIDs, dates, and CSV-based arrays.
        /// </summary>
        /// <typeparam name="T">The target type.</typeparam>
        /// <param name="raw">The raw database value.</param>
        /// <param name="defaultValue">The fallback value if conversion fails.</param>
        /// <returns>The converted value.</returns>
        private static T ConvertTo<T>(object raw, T defaultValue) {
            object result = defaultValue!;

            if (typeof(T) == typeof(bool))
                result = SQL.ToBool(raw, SQL.ToBool(defaultValue));

            else if (typeof(T) == typeof(int))
                result = SQL.ToInt32(raw, SQL.ToInt32(defaultValue));

            else if (typeof(T) == typeof(string))
                result = SQL.ToString(raw, SQL.ToString(defaultValue));

            else if (typeof(T) == typeof(DateTime))
                result = SQL.ToDateTime(raw, false, SQL.ToDateTime(defaultValue));

            else if (typeof(T) == typeof(Guid))
                result = SQL.ToGuid(raw, SQL.ToGuid(defaultValue));

            else if (typeof(T) == typeof(int[]))
                result = SQL.ToInt32ArrayFromCSV(raw, SQL.ToInt32ArrayFromCSV(defaultValue));

            else if (typeof(T) == typeof(string[]))
                result = SQL.ToStringArrayFromCSV(raw, null, SQL.ToStringArrayFromCSV(defaultValue));

            // Unsupported type → return defaultValue silently
            return (T)result!;
        }

        private static object SerializeValue<T>(T value) {
            switch (value) {
                case null:
                    return "";

                case int[] ints:
                    return string.Join(",", ints);

                case string[] strings:
                    return SerializeCsv(strings);

                default:
                    return value!;
            }
        }

        private static string SerializeCsv(IEnumerable<string> values) {
            return string.Join(",", values.Select(EscapeCsv));
        }

        private static string EscapeCsv(string s) {
            s = s.Trim();
            if (s.Contains(',') || s.Contains('"') || s.Contains('\n') || s.Contains('\r'))
                return $"\"{s.Replace("\"", "\"\"")}\"";

            return s;
        }
    }

}
