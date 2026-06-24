using System;
using System.Data;
using System.Security.Cryptography;
using System.Text;
namespace FWITD {
    internal static class Utils {

        public static string HashToID(string input) {
            if (string.IsNullOrEmpty(input))
                return "0";
            var bytes = Encoding.UTF8.GetBytes(input);
            var hash = SHA256.HashData(bytes);
            return ToBase32(hash);
        }

        private static string ToBase32(byte[] data) {
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            int bits = 0, value = 0;
            var result = new StringBuilder((data.Length * 8 + 4) / 5);

            foreach (var b in data) {
                value = (value << 8) | b;
                bits += 8;

                while (bits >= 5) {
                    result.Append(alphabet[(value >> (bits - 5)) & 31]);
                    bits -= 5;
                }
            }

            if (bits > 0)
                result.Append(alphabet[(value << (5 - bits)) & 31]);

            return result.ToString();
        }
        public static class DataTransfer {
            /// <summary>
            /// Object{
            ///     column_i: []
            /// }
            /// </summary>
            /// <param name="table"></param>
            /// <returns></returns>
            public static object ToSimpleTable(DataTable table) {
                var result = new Dictionary<string, object?[]>();
                if (table == null)
                    return result;

                foreach (DataColumn col in table.Columns) {
                    var values = table.Rows
                                      .Cast<DataRow>()
                                      .Select(r => r[col] == DBNull.Value ? null : r[col])
                                      .ToArray();

                    result.Add(col.ColumnName, values);
                }

                return result;
            }
        }
    }
}