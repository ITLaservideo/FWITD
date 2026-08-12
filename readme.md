# FWITD — Framework Web-In-The-Desktop

A shared git submodule that bridges a JavaScript/CSS/HTML frontend with a .NET host process over a WebView, plus a handful of server-side utilities (IP/CIDR checks, shared settings, key storage) reused by ASP.NET Core hosts. It targets **WPF/Windows** (`WebView2`), **.NET MAUI** (`Android`, `iOS`, `macOS`, `Windows`), and plain **ASP.NET Core** hosts from a single codebase using `#if WPF` / `#if WINDOWS` guards. Not every host compiles every file — see [Per-host file exclusions](#per-host-file-exclusions).

---

## What's inside

| Path | Purpose |
|---|---|
| `ClientApp/` | JS/CSS/HTML apps, components, utils, styles — the entire frontend (see its own [readme](ClientApp/readme.md)) |
| `Controllers/` | C# request handlers, auto-discovered and wired to JS `Lobby.post()` calls |
| `BuildingProcess/` | Dev tooling: scaffolding scripts, code generators, local static-file server for debugging |
| `WebViewUi/Ui.cs` | Push logs / method calls from native code into the loaded page (`window.live_logger`, `window.the_main_app`) |
| `icons/` | Application icons |
| `AppConfig.cs` | Maps each `StartApp` to the page/script/URL it should load, per platform |
| `AppLoader.cs` | Loads a configured `StartApp` into a registered webview; injects scripts on navigation |
| `AssetLoader.cs` | Loads frontend files from disk (Windows) or MAUI bundle (mobile) |
| `JSProvider.cs` | Builds and serves compiled HTML+JS+CSS pages/scripts to the WebView (`JS.pages`, `JS.injectable_apps` enums) |
| `RequestDispatcher.cs` | Registers a webview and routes its `Lobby.post()` messages to the matching `Controller` method by reflection |
| `RemoteServer.cs` | Central place for remote server base URLs |
| `CloudflareCidrs.cs` / `UtilsWeb.cs` | Server-side only: verifies a request's `CF-Connecting-IP` came from Cloudflare's published ranges |
| `Services/SystemSettings.cs` | Typed app settings backed by `QStorage`'s `AppSettings` / `TG_LocalSettings` |
| `Services/SystemSettingsAegisGate.cs` | AegisGate-specific variant of the above |
| `SStorageKeyStore.cs` | `DataCipher.IKeyStore` backed by `QStorage.SStorage` (Keychain/Keystore/Credential Locker/DPAPI) instead of DataCipher's default machine-wide file store |
| `Log.cs` | Rolling daily log file writer with weekly pack/merge of old logs |
| `LoadingMessagesProvider.cs` | Random localized "loading..." messages from bundled JSON |
| `MouseClicker.cs` / `TypeWriter.cs` | Windows-only P/Invoke helpers (excluded from MAUI/server builds) |
| `Utils.cs` | Misc helpers (hashing, `DataTable` → simple JSON shape, machine description) |

Database access, generic app settings (`AppSettings`), and local key/secret storage (`TG_LocalSettings`, `SStorage`) live in the separate `QStorage` library, not in FWITD itself — hosts add it as a `ProjectReference`.

---

## Add as a git submodule

```bash
# from the repo root
git submodule add <FWITD-repo-url> FWITD
git submodule update --init --recursive
```

To update to the latest submodule commit:
```bash
git submodule update --remote FWITD
```

---

## Project setup

All three host types reference `QStorage` and (for WPF/MAUI) `DataCipher` as project references:
```xml
<ItemGroup>
  <ProjectReference Include="..\LIBS\QStorage\QStorage.csproj" />
  <ProjectReference Include="..\LIBS\DataCipher\DataCipher.csproj" />
</ItemGroup>
```

### WPF / Windows

**Packages required:**
```xml
<PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
<PackageReference Include="Microsoft.Data.SqlClient" Version="7.0.1" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.4" />
```

**Set `WPF` and `WINDOWS` compile constants:**
```xml
<DefineConstants>$(DefineConstants);WPF;WINDOWS</DefineConstants>
```

**ItemGroup — embed ClientApp and SQL migrations (not loose `Content`):**
```xml
<ItemGroup>
  <None Remove="FWITD\ClientApp\**\*" />
  <None Remove="FWITD\out\**" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.min.js"   LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.min.css"  LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.min.html" LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.woff2"    LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.png"      LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <EmbeddedResource Include="FWITD\ClientApp\**\*.svg"      LogicalName="FWITD/ClientApp/%(RecursiveDir)%(Filename)%(Extension)" />
  <!-- .ico stays loose Content: shortcut creation needs a real on-disk path for the icon -->
  <Content Include="FWITD\**\*.ico" CopyToOutputDirectory="PreserveNewest" />
  <Content Include="appsettings.json" CopyToOutputDirectory="PreserveNewest" />
  <!-- SQL migrations live in the HOST project's own Assets/DBUpdate, not inside FWITD -->
  <EmbeddedResource Include="Assets\DBUpdate\*.sql" />
</ItemGroup>
```

> Embedding (not `Content`-copying) `ClientApp` keeps the frontend inside the compiled `.exe` — a loose file next to the exe would be independently rewritable by anything with filesystem access, defeating any signing/detection scheme `AssetLoader` might apply. SQL scripts must be `<EmbeddedResource>` too, since `QStorage`'s `SQL` helper loads them via `Assembly.GetManifestResourceStream()`, which never sees `<Content>`.

---

### MAUI

**Packages required:**
```xml
<PackageReference Include="Microsoft.Maui.Controls" Version="$(MauiVersion)" />
<PackageReference Include="Microsoft.Data.SqlClient" Version="7.0.1" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.4" />
```

**ItemGroup — bundle ClientApp as MAUI assets and SQL scripts as embedded resources:**
```xml
<ItemGroup>
  <!-- Frontend bundle: preserves FWITD/ClientApp/... logical path on all platforms -->
  <MauiAsset Include="FWITD\ClientApp\**"
             LogicalName="FWITD\ClientApp\%(RecursiveDir)%(Filename)%(Extension)" />

  <!-- Settings file — seeded to AppDataDirectory on first launch -->
  <MauiAsset Include="appsettings.json" LogicalName="appsettings.json" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>

<ItemGroup>
  <!-- SQL migrations live in the HOST project's own Assets/DBUpdate, not inside FWITD -->
  <EmbeddedResource Include="Assets\DBUpdate\**\*.sql" />
</ItemGroup>

<!-- Exclude Windows-only / host-specific files not needed on this platform -->
<ItemGroup>
  <Compile Remove="FWITD\Controllers\WindowsController.cs" />
  <Compile Remove="FWITD\MouseClicker.cs" />
  <Compile Remove="FWITD\TypeWriter.cs" />
  <Compile Remove="FWITD\CloudflareCidrs.cs" />
  <Compile Remove="FWITD\UtilsWeb.cs" />
  <Compile Remove="FWITD\Services\SystemSettingsAegisGate.cs" />
</ItemGroup>
```

---

### ASP.NET Core (server-side utilities only)

A pure web host (no WebView) can reference FWITD just for the shared server utilities (`CloudflareCidrs`, `UtilsWeb`, `Log`, `Utils`, `SStorageKeyStore`, settings) without pulling in the WebView bridge at all:
```xml
<ItemGroup>
  <Compile Remove="FWITD\ClientApp\**" />
  <Compile Remove="FWITD\Controllers\**" />
  <Compile Remove="FWITD\WebViewUi\**" />
  <Compile Remove="FWITD\BuildingProcess\**" />
  <Compile Remove="FWITD\AppConfig.cs" />
  <Compile Remove="FWITD\AppLoader.cs" />
  <Compile Remove="FWITD\AssetLoader.cs" />
  <Compile Remove="FWITD\JSProvider.cs" />
  <Compile Remove="FWITD\RequestDispatcher.cs" />
  <Compile Remove="FWITD\MouseClicker.cs" />
  <Compile Remove="FWITD\TypeWriter.cs" />
</ItemGroup>
```
Set `<DefineConstants>WINDOWS</DefineConstants>` if the host runs on Windows (needed by any conditional code still compiled in).

---

## Per-host file exclusions

No single host compiles the whole tree. As a quick reference:

| File | WPF | MAUI | ASP.NET Core |
|---|---|---|---|
| `Controllers/`, `ClientApp/`, `WebViewUi/`, `AppConfig.cs`, `AppLoader.cs`, `AssetLoader.cs`, `JSProvider.cs`, `RequestDispatcher.cs` | ✅ | ✅ | ❌ |
| `Controllers/WindowsController.cs`, `MouseClicker.cs`, `TypeWriter.cs` | ✅ | ❌ | ❌ |
| `CloudflareCidrs.cs`, `UtilsWeb.cs`, `Services/SystemSettingsAegisGate.cs` | ❌ | ❌ | host-dependent |

When adding a new file that only makes sense for one host type, exclude it explicitly from the others rather than guarding it entirely with `#if` — smaller, host-specific `<Compile Remove>` lists are easier to audit than scattered preprocessor directives.

---

## Startup wiring

**1. Register the WebView** so `Lobby.post()` calls reach the controllers.

WPF (`WebView2`):
```csharp
// after CoreWebView2 is initialized
RequestDispatcher.Register(myWebView2, id_webview: 1);
```

MAUI (`WebView`):
```csharp
RequestDispatcher.Register(myWebView, id_webview: 1);
```

**2. Load a `StartApp`** into a registered webview:
```csharp
await AppLoader.LoadAsync(id_webview: 1, StartApp.ServerStatus);
```
`AppLoader` looks up the app's configuration in `AppConfig._scripts` and either navigates the webview to a standalone page (`JSProvider.JS.pages`), injects a script into whatever page is already loaded (`JSProvider.JS.injectable_apps`), or navigates to a bare URL.

---

## Adding a new controller

1. Create `FWITD/Controllers/MyFeature/MyFeatureController.cs`:
```csharp
namespace FWITD.Controllers.MyFeature {
    public class MyFeatureController {
        public object GetData() => new { value = 42 };
    }
}
```

2. Call it from JS via `Lobby.post`:
```js
const result = await Lobby.post("MyFeature/GetData");
```

`RequestDispatcher`'s static constructor scans `FWITD.Controllers*` for classes ending in `Controller` and registers every public instance method as `{ClassNamePrefix}/{MethodName}` — no manual registration needed. A method may optionally take a single `JsonNode` parameter to receive the full request payload.

---

## Adding a new page or injectable app

1. Add the JS/HTML/CSS files under `ClientApp/apps_standalone/<Name>/` (full page) or `ClientApp/apps_injectable/<Name>/` (script injected into an existing page) — see `BuildingProcess/CreatePage.bat` / `CreateComponent.bat` for scaffolding.
2. Add the corresponding entry to `JSProvider.JS.pages` or `JSProvider.JS.injectable_apps`.
3. Add a `StartApp` enum value and its `AppConfig._scripts` entry so `AppLoader` knows how to load it.

---

## SQL migrations

FWITD itself has no database code — that lives in `QStorage`. Each host keeps its own numbered `.sql` files under its own `Assets/DBUpdate/`, embedded as resources and applied on startup by `QStorage`'s `SQL` helper based on a stored `db_update_version`. Use `--#split-sql-batch#--` to separate multiple batches within one file.
