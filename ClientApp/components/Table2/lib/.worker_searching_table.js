onmessage = function (e) {
    const { array_of_objects, indexes_columns_to_search, value_to_search } = e.data;
    const results = [];

    if (value_to_search.length > 0 && array_of_objects.length > 0) {
        const keys = Object.keys(array_of_objects[0]); //assume all objects have same keys as first record
        const processRows = [];
        keys.forEach(key => {
            processRows.push(Utils.getProcessRows(array_of_objects[0][key]));
        });
        array_of_objects.forEach(obj => {
            const match = indexes_columns_to_search.some(idx => {
                const key = keys[idx];
                if (!key || obj[key] == null) return false;
                const to_cmp = processRows && processRows[idx]
                    ? String(processRows[idx](obj[key]))
                    : String(obj[key]);
                return to_cmp.toLowerCase().includes(value_to_search);
            });
            if (match) results.push(obj);
        });
    } else {
        try {
            results.push(...array_of_objects);
        } catch (error) {
            results.length = 0;
            array_of_objects.forEach(obj => {
                results.push(obj);
            });
        }
    }
    self.postMessage(results);
};
class Utils {
    static getProcessRows(data) {
        if (`${data}`.trim().match(/([0-9]{4}).([0-9]{2}).([0-9]{2}).([0-9]{2}).([0-9]{2}).([0-9]{2})/)) {
            return Utils.format1;
        }
        return null;
    }
    /**
     *
     * @param {*} str_data
     * @returns //DD-MM-YYYY HH:mm:ss
     */
    static format1(str_data) {
        const date = new Date(str_data);
        return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()} ` +
            `${String(date.getHours()).padStart(2, "0")}:` +
            `${String(date.getMinutes()).padStart(2, "0")}:` +
            `${String(date.getSeconds()).padStart(2, "0")}`;
    }
}