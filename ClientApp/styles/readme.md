# styles

Shared CSS loaded at the start of every page assembly, before any component or app-specific styles.

## Load order (per assembled page)

1. **Theme variables** — `themes/vars_{theme}.css`
2. **Shared base styles** — `styles.css` (with the icon font embedded via `@BASE64FrameworkIcons`)
3. **Animations** — `animations.css`
4. Component CSS (from `components/` and `apps_standalone_components/`)
5. App-specific CSS (`MyPage.css` or inline for injectable apps)

## Files

### `styles.css` / `styles.min.css`

Global reset and base styles shared by all pages. Contains the placeholder `@BASE64FrameworkIcons` which the C# assembler replaces with the Base64-encoded Material Symbols WOFF2 font at load time.

### `animations.css` / `animations.min.css`

Keyframe animations and transition helpers used by components and apps.

### `themes/`

One CSS variables file per theme, naming all design tokens (colors, spacing, shadows, etc.):

| File | Theme |
|---|---|
| `vars_vscode_dark.css` | VS Code dark theme (default) — VS Code's "Dark Modern" webview variables |
| `vars_vscode_light.css` | VS Code light theme — same variables, line for line, resolved for VS Code's "Light Modern" theme |

Both files define the same variables (the light one adds the legacy `--default-button-color-selected`), so a component styled against one works with the other.

The active theme is set by `JSProvider.current_css_theme` (`CSSThemes` enum), persisted in `appsettings.json` as `GlobalPreferences.Theme`. At runtime it's changed via `Lobby.post("Settings/ChangeTheme", { a_number: <CSSThemes value> })`, which reloads every webview's current app with the new theme. To add a new theme, create a `vars_{name}.css` + `.min.css` pair and add the name to the `CSSThemes` enum (and to `enumThemes` in `ThemeSelector.js`).
