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
| `vars_dark.css` | Dark theme |
| `vars_light.css` | Light theme |
| `vars_vscode_dark.css` | VS Code dark theme (default) |

The active theme is set by `JSProvider.current_css_theme` (`CSSThemes` enum). To add a new theme, create a `vars_{name}.css` + `.min.css` pair and add the name to the `CSSThemes` enum.
