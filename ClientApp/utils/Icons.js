
class Icons {
    /**
     * @param {*} code_point https://fonts.google.com/icons Code point ex `e86c`
     * @param {*} user_attribute_before true = `<div class="f-icon" data-icon='&#xef71;'></div>`
     * @returns 
     */
    static create(code_point, user_attribute_before = false) {
        const icon_character_code = document.createElement('div');
        const char = String.fromCodePoint(parseInt(code_point, 16));
        if (user_attribute_before) {
            icon_character_code.classList.add('f-icon');
            icon_character_code.setAttribute('data-icon', char);
        } else {
            icon_character_code.classList.toggle("f-icon-i", true)
            icon_character_code.innerText = char;
        }
        return icon_character_code;
        //<div class="f-icon-i">&#xef71;</div>      //ef71 icon_code
        //<div class="f-icon" data-icon=""></div>
    }
    /**
     * @deprecated use create
     * @param {*} code_point 
     * @returns 
     */
    static ezIcon(code_point) {
        return Icons.create(code_point)
    }

    static #iconCache = new Map();
    static #ICON_CODE_PATTERN = /^[0-9a-f]{3,6}$/i;
    /**
     * @param {HTMLImageElement|HTMLElement} target `<img>` when passing an `icon_name`; an icon-font
     * element (the `f-icon`/`data-icon` or `f-icon-i` convention, see `create()`) when passing an `icon_code`
     * @param {string} icon_name_or_code file name (optionally prefixed with `/`) inside `ClientApp/icons`,
     * e.g. `/search.svg`; or a hex code point from https://fonts.google.com/icons, e.g. `e86c`
     */
    static async setSrcIcon(target, icon_name_or_code) {
        if (Icons.#ICON_CODE_PATTERN.test(icon_name_or_code)) {
            const char = String.fromCodePoint(parseInt(icon_name_or_code, 16));
            if (target.classList.contains("f-icon")) {
                target.setAttribute("data-icon", char);
            } else {
                target.classList.toggle("f-icon-i", true);
                target.innerText = char;
            }
            return;
        }
        const icon_name = icon_name_or_code;
        const cached = Icons.#iconCache.get(icon_name);
        if (cached != undefined) {
            target.src = cached;
            return;
        }
        const rsp = await Lobby.postAsync("App/GetIconByName", { icon_name });
        Icons.#iconCache.set(icon_name, rsp.src);
        target.src = rsp.src;
    }
}