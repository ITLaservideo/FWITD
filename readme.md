# FWITD — Framework Web-In-The-Desktop

A shared submodule that bridges a JavaScript/CSS/HTML frontend with a .NET host process over a WebView. It targets both **WPF/Windows** (`WebView2`) and **.NET MAUI** (`Android`, `iOS`, `macOS`, `Windows`) from a single codebase using `#if WINDOWS` / `#else` guards.

---

## What's inside

| Path | Purpose |
|---|---|
| `ClientApp/` | JS/CSS/HTML apps, components, utils, styles — the entire frontend |
| `Controllers/` | C# request handlers wired to JS `Lobby.post()` calls |
| `Assets/DBUpdate/` | Incremental SQL migration scripts (run on startup) |
| `BuildingProcess/` | Dev tooling: scaffolding scripts, code generators |
| `icons/` | Application icons |
| `AppSettings.cs` | JSON settings file reader/writer (`appsettings.json`) |
| `AssetLoader.cs` | Loads frontend files from disk (Windows) or MAUI bundle (mobile) |
| `JSProvider.cs` | Builds and serves compiled HTML+JS+CSS pages to the WebView |
| `RequestDispatcher.cs` | Routes WebView messages to the right `Controller` method |
| `SQL.cs` | SQL Server helper (query, non-query, scalar, stored procs, migrations) |
| `RemoteServer.cs` | Central place for remote server URLs |
| `SystemSettings.cs` / `TG_LocalSettings.cs` | Typed app settings backed by SQL |
| `MouseClicker.cs` / `TypeWriter.cs` | Windows-only P/Invoke helpers (excluded from MAUI builds) |

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

### WPF / Windows (`WebAppWrapperX`)

**Packages required:**
```xml
<PackageReference Include="Microsoft.Web.WebView2" Version="1.0.3967.48" />
<PackageReference Include="Microsoft.Data.SqlClient" Version="7.0.1" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.4" />
```

**ItemGroup — include FWITD assets and mark SQL scripts as embedded resources:**
```xml
<ItemGroup>
  <None Remove="FWITD\ClientApp\**\*" />
  <None Remove="FWITD\out\**" />
  <Content Include="FWITD\ClientApp\**\*.min.js"   CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\ClientApp\**\*.min.css"  CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\ClientApp\**\*.min.html" CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\ClientApp\**\*.woff2"    CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\ClientApp\**\*.png"      CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\ClientApp\**\*.svg"      CopyToOutputDirectory="PreserveNewest" />
  <Content Include="FWITD\**\*.ico"                CopyToOutputDirectory="PreserveNewest" />
  <Content Include="appsettings.json"              CopyToOutputDirectory="PreserveNewest" />
  <EmbeddedResource Include="FWITD\Assets\DBUpdate\*.sql" />
</ItemGroup>
```

> Previously `FWITD\Assets\DBUpdate\*.sql` was `<Content>`. It must be **`<EmbeddedResource>`** so `SQL.cs` can load migrations via `Assembly.GetManifestResourceStream()`.

---

### MAUI (`WebAppWrapperY`)

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
  <MauiAsset Include="appsettings.json" LogicalName="appsettings.json" />

  <!-- SQL migrations as embedded resources -->
  <EmbeddedResource Include="FWITD\Assets\DBUpdate\*.sql" />
</ItemGroup>

<!-- Exclude Windows-only files from non-Windows targets -->
<ItemGroup>
  <Compile Remove="FWITD\Controllers\WindowsController.cs" />
  <Compile Remove="FWITD\MouseClicker.cs" />
  <Compile Remove="FWITD\TypeWriter.cs" />
</ItemGroup>
```

---

## Startup wiring

**1. Initialize the database** (call once, before any DB use):
```csharp
SQL.Init();
```

**2. Register the WebView** so `Lobby.post()` calls reach the controllers.

WPF (`WebView2`):
```csharp
// after CoreWebView2 is initialized
RequestDispatcher.Register(myWebView2, id_webview: 1);
```

MAUI (`WebView`):
```csharp
RequestDispatcher.Register(myWebView, id_webview: 1);
```

**3. Load a page** into the WebView:
```csharp
// Standalone HTML page (written to FWITD/out/ and served from there)
string outPath = await JSProvider.getPathJSHTMLApp(JSProvider.JS.pages.AndroidAppDemo, id_webview: 1);
myWebView.Source = new Uri(outPath + ".html");

// Injectable script (injects into an existing page)
string js = await JSProvider.getScriptApp(JSProvider.JS.injectable_apps.TemplateTools, id_webview: 1);
await myWebView.ExecuteScriptAsync(js); // WPF
await myWebView.EvaluateJavaScriptAsync(js); // MAUI
```

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

Routes are discovered automatically at startup via reflection — no registration needed.

---

## Adding a new SQL migration

Drop a numbered `.sql` file in `FWITD/Assets/DBUpdate/`:
```
002_AddMyTable.sql
```

The numeric prefix determines execution order. The file runs automatically on the next `SQL.Init()` call if its version number is higher than the stored `db_update_version`.

Use `--#split-sql-batch#--` to separate multiple batches within one file.
