
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

    static setSrcIcon(target, icon_name) {
        return;
    }
}