using FWITD;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Globalization;
using System.Reflection;
using System.Text.RegularExpressions;

namespace DotNet.Utility {
    public sealed partial class SQL {
        public static string? connectionStr;
        private const string SQL_EXIST_TABLE = "SELECT OBJECT_ID(@0) AS 'Object ID';";
        private const string SQL_GET_DB_VERSION = "SELECT valore FROM TG_LocalSettings where Nome='db_update_version';";
        private const string SQL_CREATE_TG_LocalSettings = @"create table TG_LocalSettings(Nome nvarchar(50) NOT NULL PRIMARY KEY, Valore nvarchar(MAX));";
        private const string SQL_INSERT_DB_VERSION = "INSERT INTO TG_LocalSettings (Nome,Valore) values('db_update_version',@0);";
        private const string SQL_UPDATE_DB_VERSION = $"UPDATE TG_LocalSettings SET Valore=@0 WHERE Nome='db_update_version';";
        private const int COMMAND_TIMEOUT = 60; //seconds
        /// <summary>
        /// Initializes the SQL subsystem by loading the database connection string
        /// from <c>appsettings.json</c> and ensuring that all required tables and
        /// baseline data exist. This method must be called once during application
        /// startup before any database operations are performed.
        /// </summary>
        /// <remarks>
        /// <para>
        /// The method performs the following steps:
        /// </para>
        ///
        /// <list type="number">
        ///   <item>
        ///     <description>
        ///     Loads the application configuration from <c>appsettings.json</c> and
        ///     retrieves the appropriate connection string depending on the build
        ///     configuration (<c>ConnectionString</c> in DEBUG,
        ///     <c>RELEASE_ConnectionString</c> otherwise).
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Validates that a connection string is present. If missing, an exception
        ///     is thrown to prevent the application from running without a valid
        ///     database connection.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Calls <see cref="EnsureTablesAndDataExist"/> to verify that required
        ///     tables exist and to apply any pending SQL update scripts.
        ///     </description>
        ///   </item>
        /// </list>
        ///
        /// <para>
        /// This method is critical for application startup. <br></br>
        /// If <b>initialization fails</b>,
        /// the application cannot continue safely and <b>will crash</b>.
        /// </para>
        /// </remarks>
        ///
        /// <exception cref="FileNotFoundException">
        /// Thrown if <c>appsettings.json</c> cannot be found in the application directory.
        /// </exception>
        ///
        /// <exception cref="InvalidOperationException">
        /// Thrown if the configuration system fails to load or parse <c>appsettings.json</c>.
        /// Thrown when the database connection string is missing, or when
        /// <see cref="EnsureTablesAndDataExist"/> detects that the database cannot be
        /// reached or initialized.
        /// </exception>
        public static void Init() {
#if DEBUG
            var server = AppSettings.Get<string>("Device.LocalDB.LocalServer");
#else
            var server = AppSettings.Get<string>("Device.LocalDB.RemoteServer");
#endif
            connectionStr = new SqlConnectionStringBuilder {
                DataSource             = server,
                InitialCatalog         = AppSettings.Get("Device.LocalDB.Database", "Reportistica"),
                UserID                 = AppSettings.Get<string>("Device.LocalDB.UserId"),
                Password               = AppSettings.Get<string>("Device.LocalDB.Password"),
                TrustServerCertificate = AppSettings.Get("Device.LocalDB.TrustServerCertificate", true)
            }.ConnectionString;

            if (connectionStr is null) {
                var e = new InvalidOperationException("Missing DB ConnectionString from appsettings.json.");
                //Log.logger.Error(e.Message);
                throw e;
            }
            EnsureTablesAndDataExist();
        }
        /// <summary>
        /// Persists an application exception into the permanent SQL exception log,
        /// ensuring the message and stack trace conform to database size limits.
        /// </summary>
        /// <remarks>
        /// This method writes structured exception information into the SQL-based
        /// <c>dbo.GD_ExceptionLog</c> table. <br></br>
        ///
        /// <para><b>Use the SQL exception table for <b>Low-volume</b><br></br>
        /// events that must be retained long-term and made available for diagnostics, analytics,
        /// or administrative inspection like:</b></para>
        /// <list type="bullet">
        ///   <item><description>Unhandled exceptions</description></item>
        ///   <item><description>Warnings and recoverable errors</description></item>
        ///   <item><description>Business‑critical events</description></item>
        ///   <item><description>any issue that must be <b>queryable or visible in an admin UI</b></description></item>
        /// </list>
        ///
        /// <para><b>Use log files instead for:</b></para>
        /// <list type="bullet">
        ///   <item><description>Debug or trace‑level diagnostics</description></item>
        ///   <item><description>High‑volume or low‑latency logging</description></item>
        ///   <item><description>Development‑time troubleshooting</description></item>
        /// </list>
        ///
        /// If <paramref name="StackTrace"/> is omitted or empty, a simplified insert
        /// statement is executed. Otherwise, both the message and stack trace are stored. <br></br>
        ///
        /// Messages longer than the SQL column limit (NVARCHAR(2000)) are safely truncated.
        /// </remarks>
        /// <param name="ExceptionMessage">A short description of the exception or error.</param>
        /// <param name="StackTrace">Optional stack trace or extended diagnostic details.</param>
        /// <returns>The number of rows affected by the SQL insert operation.</returns>
        public static int PermaLog(string ExceptionMessage, string? StackTrace = null) {
            // Ensure message is not null/empty
            if (string.IsNullOrWhiteSpace(ExceptionMessage))
                ExceptionMessage = "<empty exception message>";

            // Enforce NVARCHAR(2000) limit
            if (ExceptionMessage.Length > MAX_EXCEPTION_MESSAGE_LENGTH) {
                // Keep the END of the message (most useful part)
                ExceptionMessage = ExceptionMessage[^MAX_EXCEPTION_MESSAGE_LENGTH..];
            }

            // Normalize empty stacktrace
            if (string.IsNullOrWhiteSpace(StackTrace)) {
                return SQL.ExecuteNonQuery(SQL_INSERT_PERMALOG, [ExceptionMessage]);
            }

            // Enforce stack trace limit
            if (StackTrace.Length > MAX_STACKTRACE_LENGTH) {
                // Keep the START of the stack trace (most useful part)
                StackTrace = StackTrace[..MAX_STACKTRACE_LENGTH]
                             + "\n... [stack trace truncated]";
            }

            return SQL.ExecuteNonQuery(SQL_INSERT_PERMALOG_PLUS, [ExceptionMessage, StackTrace]);
        }
        private const string SQL_INSERT_PERMALOG_PLUS = @"INSERT INTO dbo.GD_ExceptionLog (ExceptionMessage, StackTrace) VALUES (@0,@1);";
        private const string SQL_INSERT_PERMALOG = @"INSERT INTO dbo.GD_ExceptionLog (ExceptionMessage) VALUES (@0);";
        private const int MAX_EXCEPTION_MESSAGE_LENGTH = 2000;
        private const int MAX_STACKTRACE_LENGTH = 10000;

        /// <summary>
        /// Ensures that all required database tables and baseline data exist before the
        /// application starts operating. <br></br>
        /// This method performs initial schema validation,
        /// creates missing tables, and applies incremental SQL update scripts based on
        /// the current database version.
        /// </summary>
        /// <remarks>
        /// <para>
        /// This method is executed during application startup to guarantee that the
        /// database environment meets the minimum structural requirements for the app
        /// to function correctly. It performs the following steps:
        /// </para>
        ///
        /// <list type="number">
        ///   <item>
        ///     <description>
        ///     Verifies that the database connection is functional.
        ///     If any table cannot be queried, an exception is thrown to prevent the application from running.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Creates the <c>TG_LocalSettings</c> table if it does not exist.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Reads the current database version from the <c>TG_LocalSettings</c>
        ///     table using the <c>DB_VERSION</c> key.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Scans the <c>Assets/DBUpdate</c> directory for SQL update files embedded
        ///     as assembly resources. Each file must begin with a numeric prefix
        ///     (e.g., <c>002_AddTable.sql</c>) which represents the version number of
        ///     that update.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Executes all SQL update scripts whose version is greater than the
        ///     current database version. Scripts are processed in ascending order.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Supports multi‑batch SQL files by splitting them on the token
        ///     <c>--#split-sql-batch#--</c> and executing each batch separately.
        ///     </description>
        ///   </item>
        ///
        ///   <item>
        ///     <description>
        ///     Updates the stored database version after all applicable scripts
        ///     have been successfully executed.
        ///     </description>
        ///   </item>
        /// </list>
        ///
        /// <para>
        /// Any SQL execution errors inside update scripts are caught and ignored,
        /// allowing the update process to continue. This is intentional to avoid
        /// blocking startup due to non‑critical migration issues.
        /// </para>
        ///
        /// <para>
        /// If no embedded SQL update resources are found, the method exits
        /// after performing the basic table existence check.
        /// </para>
        /// </remarks>
        private static void CreateDatabaseIfNotExists(string dbName) {
            try {
                var builder = new SqlConnectionStringBuilder(connectionStr) { InitialCatalog = "master" };
                using var connection = new SqlConnection(builder.ConnectionString);
                connection.Open();
                using var command = new SqlCommand(
                    $"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{dbName.Replace("'", "''")}') CREATE DATABASE [{dbName.Replace("]", "]]")}];",
                    connection);
                command.CommandTimeout = COMMAND_TIMEOUT;
                command.ExecuteNonQuery();
            } catch (Exception) { }
        }

        private static void EnsureTablesAndDataExist() {
            DataTable exist = ExecuteQuery(SQL_EXIST_TABLE, ["TG_LocalSettings"]);
            if (exist.Rows.Count <= 0) {
                string dbName = AppSettings.Get("Device.LocalDB.Database", "Reportistica");
                CreateDatabaseIfNotExists(dbName);
                exist = ExecuteQuery(SQL_EXIST_TABLE, ["TG_LocalSettings"]);
                if (exist.Rows.Count <= 0)
#if WINDOWS
                    throw new InvalidOperationException("can't communicate with database");
#else
                    return;
#endif
            }
            if (DBNull.Value == exist.Rows[0][0]) {
                ExecuteNonQuery(SQL_CREATE_TG_LocalSettings);
            }
            int db_version = Convert.ToInt32(ExecuteScalar(SQL_GET_DB_VERSION));

            var assembly = Assembly.GetExecutingAssembly();
            var updates = assembly.GetManifestResourceNames()
                .Where(n => n.Contains(".Assets.DBUpdate.") && n.EndsWith(".sql"))
                .Select(resourceName => {
                    var parts = resourceName.Split('.');
                    var stem = parts.Length >= 2 ? parts[^2] : "";
                    var match = RegexDbVersion().Match(stem);
                    return new { ResourceName = resourceName, Match = match };
                })
                .Where(x => x.Match.Success)
                .Select(x => new {
                    x.ResourceName,
                    Version = int.Parse(x.Match.Groups[1].Value)
                })
                .Where(x => x.Version > db_version)
                .OrderBy(x => x.Version)
                .ToList();

            foreach (var update in updates) {
                using var stream = assembly.GetManifestResourceStream(update.ResourceName)!;
                using var reader = new StreamReader(stream);
                string sql = reader.ReadToEnd();
                try {
                    string[] batches = sql.Split("--#split-sql-batch#--");
                    for (int q = 0; q < batches.Length; q++) {
                        ExecuteNonQuery(batches[q]);
                    }
                    db_version = update.Version;
                } catch { }
            }

            if (updates.Count > 0) {
                if (0 == ExecuteNonQuery(SQL_UPDATE_DB_VERSION, [db_version])) {
                    ExecuteNonQuery(SQL_INSERT_DB_VERSION, [db_version]);
                }
            }
        }

        private static string QueryToString(string query, object[]? parameters = null) {
            return string.Format("{0}|{1}", query, parameters == null ? "" : string.Join(",", parameters));
        }
        /// <summary>
        /// Executes a SQL query and returns the result as a DataTable.
        /// </summary>
        /// <param name="query">The SQL query to execute.</param>
        /// <param name="parameters">Optional parameters to include in the SQL query. Default is null.</param>
        /// <param name="timeoutSecondi">The timeout for the SQL command in seconds. Default is 0, which uses a predefined command timeout.</param>
        /// <returns>A DataTable containing the results of the query or empty DataTable.</returns>
        public static DataTable ExecuteQuery(string query, object[]? parameters = null, int timeoutSecondi = 0) {
            try {
                //Log.loggerSQL.Trace(QueryToString(query, parameters));
                using SqlConnection connection = new(connectionStr);
                using SqlCommand command = new(query, connection);
                command.Connection.Open();
                if (parameters != null) {
                    for (int i = 0; i < parameters.Length; ++i) {
                        string nameparam = string.Format($"@{i}", i);
                        if (parameters[i] != null) {
                            command.Parameters.AddWithValue(nameparam, parameters[i]);
                        } else {
                            command.Parameters.AddWithValue(nameparam, DBNull.Value);
                        }
                    }
                }
                if (timeoutSecondi >= 10)
                    command.CommandTimeout = timeoutSecondi;
                else
                    command.CommandTimeout = COMMAND_TIMEOUT;

                DataTable datatable = new DataTable();
                datatable.Load(command.ExecuteReader());
                return datatable;
            } catch (Exception ex) {
                //Log.loggerSQL.Error("ExecuteQuery <<{0}>>\nERR:{1}", QueryToString(query, parameters), FormatEx(ex));
                return new DataTable();
            }
        }
        /// <summary>
        /// Executes a non-query SQL command, such as an INSERT, UPDATE, or DELETE statement, against a SQL database using the provided SQL query and parameters.
        /// </summary>
        /// <param name="query">The SQL query to be executed.</param>
        /// <param name="parameters">An optional array of objects representing the parameters to be used in the SQL query. Each parameter will be added to the <see cref="SqlCommand"/> using the AddWithValue method. If a parameter is <c>null</c>, it will be set to <see cref="DBNull.Value"/>.</param>
        /// <returns>The number of rows affected by the SQL command. If an exception occurs, it returns -1.</returns>
        public static int ExecuteNonQuery(string query, object[]? parameters = null) {
            try {
                //Log.loggerSQL.Trace(QueryToString(query, parameters));
                using SqlConnection connection = new SqlConnection(connectionStr);
                using SqlCommand command = new SqlCommand(query, connection);
                command.Connection.Open();
                if (parameters != null) {
                    for (int i = 0; i < parameters.Length; ++i) {
                        string nameparam = string.Format($"@{i}", i);
                        if (parameters[i] != null) {
                            command.Parameters.AddWithValue(nameparam, parameters[i]);
                        } else {
                            command.Parameters.AddWithValue(nameparam, DBNull.Value);
                        }
                    }
                }
                command.CommandTimeout = COMMAND_TIMEOUT;
                return command.ExecuteNonQuery();
            } catch (Exception ex) {
                //Log.loggerSQL.Error("ExecuteNonQuery <<{0}>>\nERR:{1}", QueryToString(query, parameters), FormatEx(ex));
                return -1;
            }
        }
        /// <summary>
        /// Executes the query, and returns the first column of the first row in the result
        /// set returned by the query. Additional columns or rows are ignored.
        /// </summary>
        /// <param name="query">The SQL query to execute.</param>
        /// <param name="parameters">Optional parameters to include in the SQL query. Default is null.</param>
        /// <param name="timeoutSecondi">The timeout for the SQL command in seconds. Default is 0, which uses a predefined command timeout.</param>
        /// <remarks> does not support query with duplicated parameters ex. [where @0 and @0 ] </remarks>
        /// <returns>object || -1</returns>
        public static object ExecuteScalar(string query, object[]? parameters = null, int timeoutSecondi = 0) {
            try {
                //Log.loggerSQL.Trace(QueryToString(query, parameters));
                using SqlConnection connection = new(connectionStr);
                using SqlCommand command = new(query, connection);
                command.Connection.Open();
                if (parameters != null) {
                    for (int i = 0; i < parameters.Length; ++i) {
                        string nameparam = string.Format($"@{i}", i);
                        if (parameters[i] != null) {
                            command.Parameters.AddWithValue(nameparam, parameters[i]);
                        } else {
                            command.Parameters.AddWithValue(nameparam, DBNull.Value);
                        }
                    }
                }

                if (timeoutSecondi >= 0)
                    command.CommandTimeout = timeoutSecondi;
                else
                    command.CommandTimeout = COMMAND_TIMEOUT;

                return command.ExecuteScalar();
            } catch (Exception ex) {
                //Log.loggerSQL.Error("ExecuteScalar <<{0}>>\nERR:{1}", QueryToString(query, parameters), FormatEx(ex));
                return -1;
            }
        }

        /// <summary>
        /// Executes the store procedures
        /// </summary>
        /// <param name="spName">The SQL store procedures names.</param>
        /// <param name="parameters">Optional parameters to include in the SQL store procedures.</param>
        /// <returns>DataTable</returns>
        public static DataTable ExecuteStoredProcedure(string spName, Dictionary<string, object>? parameters = null) {
            try {
                using SqlConnection connection = new(connectionStr);
                using SqlCommand command = new(spName, connection);
                command.CommandType = System.Data.CommandType.StoredProcedure;
                command.Connection.Open();
                if (parameters != null) {
                    foreach (var p in parameters)
                        command.Parameters.AddWithValue(p.Key, p.Value ?? DBNull.Value);
                }
                command.CommandTimeout = COMMAND_TIMEOUT;
                DataTable datatable = new DataTable();
                datatable.Load(command.ExecuteReader());
                return datatable;
            } catch (Exception ex) {
                //Log.loggerSQL.Error("ExecuteStoredProcedure <<{0}>>\nERR:{1}", spName, FormatEx(ex));
                return new DataTable();
            }
        }

        private static string FormatEx(Exception ex) {
            var lines = ex.ToString().Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length <= 5)
                return ex.ToString();
            return string.Join("\n", lines.Take(2)) + "\n   ...\n" + string.Join("\n", lines.TakeLast(3));
        }

        #region utils
        /// <summary>
        /// Converts an object to a <see cref="decimal"/>, tolerating both Italian (1.234,56)
        /// and English (1,234.56) number formats by detecting which separator comes first.
        /// </summary>
        /// <param name="something">
        /// Any object whose string representation contains a numeric value.
        /// Accepts <c>null</c>, <see cref="DBNull"/>, and non-numeric strings (returns 0).
        /// </param>
        /// <returns>
        /// The parsed decimal value, or <c>0</c> if (<paramref name="something"/> is null,
        /// <see cref="DBNull"/>, or contains no recognisable numeric pattern).
        /// </returns>
        /// <remarks>
        /// Never throws: values that overflow <see cref="decimal"/> silently return <c>0</c>.
        /// </remarks>
        public static decimal ToDecimal(object something) {
            if (IsNull(something))
                return 0m;
            var the_match = RegexDecimal().Match(SQL.ToString(something)); ;
            if (!the_match.Success) {
                return 0m;
            }
            string the_something = the_match.Value;
            if (the_something.IndexOf('.') < the_something.IndexOf(',')) {
                the_something = the_something.Replace(".", "");
            }
            if (the_something.IndexOf(',') < the_something.IndexOf('.') && the_something.Contains(',', StringComparison.InvariantCulture)) {
                the_something = the_something.Replace(",", "");
            }
            if (!decimal.TryParse(the_something.Replace(',', '.'), NumberStyles.Number, new NumberFormatInfo() { NumberDecimalSeparator = "." }, out var parsed)) {
                return 0m;
            }
            return parsed;
        }
        public static int ToInt32(object something, int on_fail = 0) {
            if (IsNull(something))
                return on_fail;

            if (something is int i)
                return i;

            return int.TryParse(Convert.ToString(something), out var result) ? result : on_fail;
        }
        public static int[] ToInt32ArrayFromCSV(object something, int[]? _default = null) {
            string raw = ToString(something);
            if (string.IsNullOrWhiteSpace(raw)) {
                if (_default == null) {
                    _default = [];
                }
                return _default;
            }
            if (raw.StartsWith('['))
                raw = raw[1..];

            if (raw.EndsWith(']'))
                raw = raw[..^1];

            List<int> results = new List<int>();

            foreach (var part in raw.Split(',')) {
                var trimmed = part.Trim();
                if (trimmed.Length == 0) {
                    continue;
                }

                if (int.TryParse(trimmed, out int value)) {
                    results.Add(value);
                }
                // ignore invalid integers
            }

            return results.ToArray();
        }

        public static string[] ToStringArrayFromCSV(object something, Func<string, string>? transform = null, string[]? _default = null) {
            string raw = ToString(something, "");
            if (string.IsNullOrWhiteSpace(raw))
                return [];

            if (raw.StartsWith('['))
                raw = raw[1..];

            if (raw.EndsWith(']'))
                raw = raw[..^1];

            using var parser = new Microsoft.VisualBasic.FileIO.TextFieldParser(new StringReader(raw));
            parser.HasFieldsEnclosedInQuotes = true;
            parser.SetDelimiters(",");

            try {
                var fields = parser.ReadFields() ?? [];

                if (transform is null)
                    return fields;
                for (int i = 0; i < fields.Length; i++)
                    fields[i] = transform(fields[i]);

                return fields;
            } catch {
                return [];
            }
        }



        public static bool ToBool(object something, bool _default = false) {
            if (IsNull(something))
                return _default;

            if (something is bool b)
                return b;

            var s = Convert.ToString(something)?.Trim();
            if (string.IsNullOrEmpty(s))
                return _default;

            if (s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase))
                return true;

            if (s == "0" || s.Equals("false", StringComparison.OrdinalIgnoreCase))
                return false;

            return bool.TryParse(s, out var result) && result;
        }
        public static bool IsNull(object value) => value is null || value == DBNull.Value;
        public static string ToString(object something, string? when_empty = "") {
            if (IsNull(something))
                return when_empty ?? "";
            return Convert.ToString(something)?.Trim() ?? (when_empty ?? "");
        }
        public static Guid ToGuid(object something, Guid? _default = null) {
            if (IsNull(something))
                return (_default ?? Guid.Empty);

            return Guid.TryParse(Convert.ToString(something), out var g) ? g : (_default ?? Guid.Empty);
        }

        internal static DateTime ToDateTime(object something, bool force_USformat = false /* MM*dd*yyyy */, DateTime? _default = null) {
            if (_default == null) {
                _default = DateTime.MinValue;
            }
            if (IsNull(something))
                return (DateTime)_default;

            var s = Convert.ToString(something);
            if (string.IsNullOrWhiteSpace(s))
                return (DateTime)_default;

            // US formats
            if (force_USformat) {
                string[] usFormats = {
                                        "MM/dd/yyyy HH:mm:ss",
                                        "M/d/yyyy HH:mm:ss",
                                        "MM/dd/yyyy",
                                        "M/d/yyyy"
                                    };

                DateTime dtUS;
                if (DateTime.TryParseExact(
                        s,
                        usFormats,
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out dtUS))
                    return dtUS;

                return (DateTime)_default;
            }

            // Normal invariant parsing
            DateTime dt;
            if (DateTime.TryParse(
                    s,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out dt))
                return dt;

            return (DateTime)_default;
        }

        [GeneratedRegex(@"^(\d+)")]
        private static partial Regex RegexDbVersion();
        [GeneratedRegex("[0-9,.]+")]
        private static partial Regex RegexDecimal();
        #endregion
    }
}
