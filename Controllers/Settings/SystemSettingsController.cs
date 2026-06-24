using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    public class SystemSettingsController {

        private static readonly PropertyInfo[] _allProps = typeof(SystemSettings).GetProperties(BindingFlags.Public | BindingFlags.Static);

        private static readonly PropertyInfo[] _writableProps = [.. _allProps.Where(p => p.CanWrite)];

        private static readonly Dictionary<string, PropertyInfo> _writablePropMap =
            _writableProps.ToDictionary(p => p.Name);

        public object Get() {
            var result = _allProps.ToDictionary(
                p => p.Name,
                p => p.GetValue(null)
            );
            return result;
        }

        public object Meta() {
            var meta = _allProps.Select(p => new {
                key = p.Name,
                type = GetTypeName(p.PropertyType),
                writable = p.CanWrite,
            });
            return meta;
        }

        public object Patch(JsonNode req) {
            foreach (var kv in req.AsObject()) {
                if (kv.Key.StartsWith("__")) continue;
                if (!_writablePropMap.TryGetValue(kv.Key, out var prop)) continue;
                object? value = kv.Value is null || kv.Value.GetValueKind() == JsonValueKind.Null
                    ? (prop.PropertyType.IsValueType ? Activator.CreateInstance(prop.PropertyType) : null)
                    : kv.Value.Deserialize(prop.PropertyType);
                prop.SetValue(null, value);
            }
            return new { ok = true };
        }

        private static string GetTypeName(Type t) {
            if (t == typeof(bool)) return "bool";
            if (t == typeof(int) || t == typeof(long) || t == typeof(float) || t == typeof(double) || t == typeof(decimal)) return "number";
            if (t == typeof(DateTime) || t == typeof(DateTimeOffset)) return "datetime";
            if (t == typeof(Guid)) return "guid";
            return "string";
        }
    }
}
