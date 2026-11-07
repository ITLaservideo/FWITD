using QStorage;
using System.Linq;
using System.Text.Json.Nodes;
using Newtonsoft.Json.Linq;

namespace FWITD.Controllers.VehicleMaintenance {
    /// <summary>
    /// Maintenance tracker for one or more vehicles (motorcycles and cars), each one a "profile" in <see cref="UserSettings"/>
    /// under <see cref="Root"/>: its info (type, model, plate, year), its mileage and, per catalog task, when it was last done.
    /// </summary>
    internal class VehicleMaintenanceController {
        private enum VehicleType { Motorcycle, Car }
        private enum Category { Ordinary, Extraordinary }

        private sealed class TaskDef {
            public required string Key { get; init; }
            public required string Label { get; init; }
            public Category Category { get; init; }
            public int? IntervalKm { get; init; }
            public int? IntervalDays { get; init; }
        }

        private static readonly Dictionary<VehicleType, TaskDef[]> Catalogs = new() {
            [VehicleType.Motorcycle] = [
                new() { Key = "EngineOilFilter", Label = "Engine oil + filter (3,000–8,000 km or 12 months)", Category = Category.Ordinary, IntervalKm = 3000, IntervalDays = 365 },
                new() { Key = "ChainLube", Label = "Chain lubrication (800–1,600 km, more often after rain)", Category = Category.Ordinary, IntervalKm = 800 },
                new() { Key = "ChainTension", Label = "Chain tension check (every 1,600 km — target slack 25–35 mm)", Category = Category.Ordinary, IntervalKm = 1600 },
                new() { Key = "AirFilter", Label = "Air filter inspection (12,000–20,000 km)", Category = Category.Ordinary, IntervalKm = 12000 },
                new() { Key = "BrakePadsInspect", Label = "Brake pad inspection (every 5,000 km; replace under 2–3 mm)", Category = Category.Ordinary, IntervalKm = 5000 },
                new() { Key = "TireWearCheck", Label = "Tire wear check (every ride; replace under 1.6 mm tread)", Category = Category.Ordinary, IntervalDays = 7 },
                new() { Key = "SparkPlugs", Label = "Spark plugs (nickel 8,000–12,000 km; iridium 24,000–48,000 km)", Category = Category.Ordinary, IntervalKm = 8000 },
                new() { Key = "BrakeFluid", Label = "Brake fluid (every 24 months)", Category = Category.Ordinary, IntervalDays = 720 },
                new() { Key = "Coolant", Label = "Coolant (every 24–36 months)", Category = Category.Ordinary, IntervalDays = 720 },
                new() { Key = "BatteryCheck", Label = "Battery check (annually; charge if stored)", Category = Category.Ordinary, IntervalDays = 365 },
                new() { Key = "GeneralInspection", Label = "General inspection — bolts, bearings, cables, suspension, electrical (once a year)", Category = Category.Ordinary, IntervalDays = 365 },
                new() { Key = "ValveClearance", Label = "Valve clearance check (24,000–40,000 km depending on engine)", Category = Category.Extraordinary, IntervalKm = 24000 },
                new() { Key = "ChainSprockets", Label = "Chain + sprocket replacement (24,000–32,000 km well maintained; as low as 12,000 km if neglected)", Category = Category.Extraordinary, IntervalKm = 24000 },
                new() { Key = "TireReplacement", Label = "Tire replacement (sport 8,000–12,000 km; touring/cruiser 20,000–32,000 km; or over 5 years)", Category = Category.Extraordinary, IntervalKm = 8000, IntervalDays = 1825 },
                new() { Key = "ForkOil", Label = "Fork oil (20,000–30,000 km or 2–3 years)", Category = Category.Extraordinary, IntervalKm = 20000, IntervalDays = 730 },
                new() { Key = "SteeringBearings", Label = "Steering head bearings (inspect every 20,000 km; replace when notchy)", Category = Category.Extraordinary, IntervalKm = 20000 },
                new() { Key = "FuelSystemCleaning", Label = "Fuel system cleaning (as needed; more often if the bike sits for months)", Category = Category.Extraordinary },
                new() { Key = "BrakeLines", Label = "Rubber hoses & brake lines (every 4–6 years)", Category = Category.Extraordinary, IntervalDays = 1460 },
            ],
            [VehicleType.Car] = [
                new() { Key = "EngineOilFilter", Label = "Engine oil + filter (10,000–15,000 km or 12 months)", Category = Category.Ordinary, IntervalKm = 10000, IntervalDays = 365 },
                new() { Key = "AirFilter", Label = "Engine air filter (20,000–30,000 km)", Category = Category.Ordinary, IntervalKm = 20000 },
                new() { Key = "CabinFilter", Label = "Cabin (pollen) filter (15,000 km or 12 months)", Category = Category.Ordinary, IntervalKm = 15000, IntervalDays = 365 },
                new() { Key = "TireRotation", Label = "Tire rotation (every 10,000 km)", Category = Category.Ordinary, IntervalKm = 10000 },
                new() { Key = "TirePressureWear", Label = "Tire pressure & tread check (monthly; replace under 1.6 mm, 3 mm recommended)", Category = Category.Ordinary, IntervalDays = 30 },
                new() { Key = "BrakePadsInspect", Label = "Brake pads & discs inspection (every 10,000 km)", Category = Category.Ordinary, IntervalKm = 10000 },
                new() { Key = "BrakeFluid", Label = "Brake fluid (every 24 months)", Category = Category.Ordinary, IntervalDays = 730 },
                new() { Key = "WiperBlades", Label = "Wiper blades (every 12 months)", Category = Category.Ordinary, IntervalDays = 365 },
                new() { Key = "BatteryCheck", Label = "Battery check (annually; usual life 4–5 years)", Category = Category.Ordinary, IntervalDays = 365 },
                new() { Key = "AirConditioning", Label = "Air conditioning service (every 24 months)", Category = Category.Ordinary, IntervalDays = 730 },
                new() { Key = "GeneralInspection", Label = "General inspection — lights, fluid levels, belts, hoses, suspension (once a year)", Category = Category.Ordinary, IntervalDays = 365 },
                new() { Key = "RoadworthinessTest", Label = "Roadworthiness test (by law — typically every 2 years)", Category = Category.Ordinary, IntervalDays = 730 },
                new() { Key = "SparkPlugs", Label = "Spark plugs, petrol engines (30,000–100,000 km depending on type)", Category = Category.Extraordinary, IntervalKm = 30000 },
                new() { Key = "FuelFilter", Label = "Fuel filter, diesel engines (30,000–60,000 km)", Category = Category.Extraordinary, IntervalKm = 30000 },
                new() { Key = "Coolant", Label = "Coolant (60,000–100,000 km or 4–5 years)", Category = Category.Extraordinary, IntervalKm = 60000, IntervalDays = 1460 },
                new() { Key = "TransmissionFluid", Label = "Gearbox / transmission fluid (60,000–100,000 km)", Category = Category.Extraordinary, IntervalKm = 60000 },
                new() { Key = "AccessoryBelt", Label = "Accessory (serpentine) belt (60,000–100,000 km)", Category = Category.Extraordinary, IntervalKm = 60000 },
                new() { Key = "TimingBelt", Label = "Timing belt + water pump (60,000–160,000 km or 5–10 years — see the owner's manual)", Category = Category.Extraordinary, IntervalKm = 100000, IntervalDays = 2190 },
                new() { Key = "TireReplacement", Label = "Tire replacement (40,000–60,000 km or over 6 years)", Category = Category.Extraordinary, IntervalKm = 40000, IntervalDays = 2190 },
                new() { Key = "ShockAbsorbers", Label = "Shock absorbers inspection (every 80,000 km)", Category = Category.Extraordinary, IntervalKm = 80000 },
            ],
        };

        private const string Root = "VehicleMaintenance";
        /// <summary>root used before the app was renamed from HealthChecker, when it only handled motorcycles</summary>
        private const string LegacyRoot = "HealthCheckerMoto";

        static VehicleMaintenanceController() {
            MigrateLegacySettings();
        }

        /// <summary>
        /// One-time move of the motorcycle-only `HealthCheckerMoto` settings to <see cref="Root"/>, tagging every
        /// existing profile as a motorcycle. Runs once per process (static constructor), never overwrites data
        /// already stored under <see cref="Root"/>.
        /// </summary>
        private static void MigrateLegacySettings() {
            // UserSettings.Get persists the default when a path is missing: a stray `null` left at either root is removed below
            var legacy = UserSettings.Get<JToken?>(LegacyRoot, null);
            var current = UserSettings.Get<JToken?>(Root, null);
            if (current is not JObject) {
                UserSettings.Remove(Root);
                if (legacy is JObject legacy_obj) {
                    if (legacy_obj["Profiles"] is JObject profiles) {
                        foreach (var profile in profiles.Properties().Select(p => p.Value).OfType<JObject>()) {
                            if (profile["Info"] is not JObject info) {
                                profile["Info"] = info = new JObject();
                            }
                            info["Type"] = nameof(VehicleType.Motorcycle);
                        }
                    }
                    UserSettings.Set(Root, legacy_obj);
                }
            }
            UserSettings.Remove(LegacyRoot);
        }

        private static string ProfilePath(string id, string suffix) => $"{Root}.Profiles.{id}.{suffix}";

        private static List<string> GetProfileIds() => UserSettings.Get<List<string>?>($"{Root}.ProfileIds", null) ?? [];

        /// <summary>
        /// A profile without a stored type predates car support, so it's a motorcycle.
        /// </summary>
        private static VehicleType GetVehicleType(string id) =>
            Enum.TryParse<VehicleType>(UserSettings.Get<string?>(ProfilePath(id, "Info.Type"), null), out var type) ? type : VehicleType.Motorcycle;

        private static string DefaultName(VehicleType type) => type == VehicleType.Car ? "My Car" : "My Motorcycle";

        /// <summary>
        /// Returns the current profile id, creating the very first profile on first-ever use.
        /// </summary>
        private static string EnsureCurrentProfile() {
            var currentId = UserSettings.Get<string?>($"{Root}.CurrentProfileId", null);
            var ids = GetProfileIds();
            if (!string.IsNullOrEmpty(currentId) && ids.Contains(currentId)) return currentId;

            var id = ids.Count > 0 ? ids[0] : CreateProfileId();
            UserSettings.Set($"{Root}.CurrentProfileId", id);
            return id;
        }

        private static string CreateProfileId() {
            var id = Guid.NewGuid().ToString("N");
            var ids = GetProfileIds();
            ids.Add(id);
            UserSettings.Set($"{Root}.ProfileIds", ids);
            return id;
        }

        public object ListProfiles() {
            var currentId = EnsureCurrentProfile();
            var profiles = GetProfileIds().Select(id => {
                var type = GetVehicleType(id);
                return new {
                    id,
                    type = type.ToString(),
                    model = UserSettings.Get<string?>(ProfilePath(id, "Info.Model"), null) ?? DefaultName(type),
                    plate = UserSettings.Get<string?>(ProfilePath(id, "Info.Plate"), null),
                    isCurrent = id == currentId,
                };
            }).ToList();
            return profiles;
        }

        public object CreateProfile() {
            var id = CreateProfileId();
            UserSettings.Set($"{Root}.CurrentProfileId", id);
            return new { id };
        }

        public object SwitchProfile(JsonNode req) {
            string id = req["id"]!.GetValue<string>();
            if (GetProfileIds().Contains(id)) {
                UserSettings.Set($"{Root}.CurrentProfileId", id);
            }
            return new { ok = true };
        }

        public object DeleteProfile(JsonNode req) {
            string id = req["id"]!.GetValue<string>();
            var ids = GetProfileIds();
            if (!ids.Contains(id)) return new { ok = true };
            ids.Remove(id);
            UserSettings.Set($"{Root}.ProfileIds", ids);
            UserSettings.Remove($"{Root}.Profiles.{id}");

            if (UserSettings.Get<string?>($"{Root}.CurrentProfileId", null) == id) {
                UserSettings.Set<string?>($"{Root}.CurrentProfileId", ids.Count > 0 ? ids[0] : null);
            }
            return new { ok = true };
        }

        public object GetInfo() {
            var id = EnsureCurrentProfile();
            var hasType = UserSettings.Get<string?>(ProfilePath(id, "Info.Type"), null) != null;
            var model = UserSettings.Get<string?>(ProfilePath(id, "Info.Model"), null);
            var plate = UserSettings.Get<string?>(ProfilePath(id, "Info.Plate"), null);
            var year = UserSettings.Get<int?>(ProfilePath(id, "Info.Year"), null);
            return new { type = GetVehicleType(id).ToString(), model, plate, year, hasInfo = hasType && !string.IsNullOrWhiteSpace(model) };
        }

        public object SaveInfo(JsonNode req) {
            var id = EnsureCurrentProfile();
            var type = Enum.TryParse<VehicleType>(req["type"]?.GetValue<string>(), out var t) ? t : GetVehicleType(id);
            var model = req["model"]?.GetValue<string>();
            var plate = req["plate"]?.GetValue<string>();
            int? year = req["year"] is JsonValue v && v.TryGetValue<int>(out var y) ? y : null;
            UserSettings.Set(ProfilePath(id, "Info.Type"), type.ToString());
            UserSettings.Set(ProfilePath(id, "Info.Model"), string.IsNullOrWhiteSpace(model) ? DefaultName(type) : model);
            UserSettings.Set(ProfilePath(id, "Info.Plate"), plate);
            UserSettings.Set(ProfilePath(id, "Info.Year"), year);
            return new { ok = true };
        }

        public object GetCurrentMileage() {
            var id = EnsureCurrentProfile();
            var km = UserSettings.Get<int?>(ProfilePath(id, "CurrentMileageKm"), null);
            var date = UserSettings.Get<DateTime?>(ProfilePath(id, "CurrentMileageDate"), null);
            return new { currentMileageKm = km, currentMileageDate = date };
        }

        public object SaveMileage(JsonNode req) {
            var id = EnsureCurrentProfile();
            int km = req["km"]!.GetValue<int>();
            UserSettings.Set(ProfilePath(id, "CurrentMileageKm"), km);
            UserSettings.Set(ProfilePath(id, "CurrentMileageDate"), DateTime.Now);
            if (UserSettings.Get<int?>(ProfilePath(id, "FirstSeenMileageKm"), null) is null) {
                UserSettings.Set(ProfilePath(id, "FirstSeenMileageKm"), km);
                UserSettings.Set(ProfilePath(id, "FirstSeenDate"), DateTime.Now);
            }
            return new { ok = true };
        }

        public object ListMaintenance() => BuildDashboard(EnsureCurrentProfile());

        public object MarkDone(JsonNode req) {
            var id = EnsureCurrentProfile();
            string key = req["key"]!.GetValue<string>();
            int km = UserSettings.Get<int?>(ProfilePath(id, "CurrentMileageKm"), null) ?? 0;
            UserSettings.Set(ProfilePath(id, $"Tasks.{key}.LastKm"), km);
            UserSettings.Set(ProfilePath(id, $"Tasks.{key}.LastDate"), DateTime.Now);
            return BuildDashboard(id);
        }

        private static object BuildDashboard(string profileId) {
            int currentKm = UserSettings.Get<int?>(ProfilePath(profileId, "CurrentMileageKm"), null) ?? 0;
            int? firstKm = UserSettings.Get<int?>(ProfilePath(profileId, "FirstSeenMileageKm"), null);
            DateTime? firstDate = UserSettings.Get<DateTime?>(ProfilePath(profileId, "FirstSeenDate"), null);
            DateTime now = DateTime.Now;

            var rows = new List<object>();
            foreach (var t in Catalogs[GetVehicleType(profileId)]) {
                int? lastKm = UserSettings.Get<int?>(ProfilePath(profileId, $"Tasks.{t.Key}.LastKm"), null) ?? firstKm;
                DateTime? lastDate = UserSettings.Get<DateTime?>(ProfilePath(profileId, $"Tasks.{t.Key}.LastDate"), null) ?? firstDate;

                int? kmRemaining = t.IntervalKm.HasValue && lastKm.HasValue
                    ? lastKm.Value + t.IntervalKm.Value - currentKm
                    : null;
                int? daysRemaining = t.IntervalDays.HasValue && lastDate.HasValue
                    ? (int)Math.Ceiling((lastDate.Value.AddDays(t.IntervalDays.Value) - now).TotalDays)
                    : null;

                rows.Add(new {
                    key = t.Key,
                    label = t.Label,
                    category = t.Category.ToString(),
                    lastKm,
                    lastDate,
                    kmRemaining,
                    daysRemaining,
                    status = ComputeStatus(kmRemaining, t.IntervalKm, daysRemaining, t.IntervalDays),
                });
            }
            return rows;
        }

        private static string ComputeStatus(int? kmRemaining, int? kmInterval, int? daysRemaining, int? daysInterval) {
            if (!kmRemaining.HasValue && !daysRemaining.HasValue) return "info";
            if ((kmRemaining is <= 0) || (daysRemaining is <= 0)) return "overdue";
            bool warning = (kmRemaining.HasValue && kmRemaining <= kmInterval * 0.15)
                || (daysRemaining.HasValue && daysRemaining <= daysInterval * 0.15);
            return warning ? "warning" : "ok";
        }
    }
}
