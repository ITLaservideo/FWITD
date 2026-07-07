
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
    /**
     * @param {HTMLImageElement} target
     * @param {string} icon_name file name (optionally prefixed with `/`) inside `ClientApp/icons`, e.g. `/search.svg`
     */
    static async setSrcIcon(target, icon_name) {
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