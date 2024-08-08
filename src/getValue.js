const storage = new Map()

HTMLElement.prototype.getValue = function () {
    let value = getValue(this)
    return value;
};

HTMLInputElement.prototype.getValue = function () {
    let value = getValue(this)
    return value;
};

HTMLHeadingElement.prototype.getValue = function () {
    let value = getValue(this)
    return value;
};

// TODO: check if using a a switch case will provide better performance
const getValue = (element) => {
    let value = element.value || element.getAttribute('value') || "";
    if (element.hasAttribute('component') || element.hasAttribute('plugin') || element.type === 'file' || element.getAttribute('type') === 'file') {
        value = storage.get(element)
        storage.delete(element)
        return value
    }

    let prefix = element.getAttribute('value-prefix') || "";
    let suffix = element.getAttribute('value-suffix') || "";
    let valueType = element.getAttribute('value-type');

    if (element.type === "checkbox") {
        let inputs = [element]
        let key = element.getAttribute('key');
        if (key)
            inputs = document.querySelectorAll(`input[type="${element.type}"][key="${key}"]`);


        if (inputs.length > 1) {
            value = [];
            inputs.forEach(el => {
                if (el.checked) {
                    let checkedValue = el.value
                    if (prefix || suffix)
                        checkedValue = prefix + checkedValue + suffix;

                    value.push(checkedValue);
                }
            });
        } else {
            if (element.checked) {
                if (element.hasAttribute('value'))
                    value = element.value || true
                else
                    value = true
            } else
                value = false

        }
    } else if (element.type === 'radio') {
        let key = element.getAttribute('key');
        value = document.querySelector(`input[key="${key}"]:checked`).value
    } else if (element.type === "number") {
        value = Number(value);
    } else if (element.type === 'range') {
        value = [Number(element.min), Number(element.value)];
    } else if (element.type === "password") {
        value = btoa(value || '');
    } else if (element.type === "email") {
        value = value.toLowerCase();
    } else if (element.type === "url") {
        // TODO: define attributes to return url parts
        // return as a string or an object of url parts
    } else if (element.tagName == "SELECT" && element.hasAttribute('multiple')) {
        let options = element.selectedOptions;
        value = [];
        for (let i = 0; i < options.length; i++) {
            let optionValue = options[i].value
            if (prefix || suffix)
                optionValue = prefix + optionValue + suffix;
            value.push(optionValue);
        }
    } else if (["time", "date", "datetime", "datetime-local"].includes(element.getAttribute('type'))) {
        if (value === '$now')
            value = new Date()
        else if (value)
            value = new Date(value)

        if (value) {
            if (!valueType)
                value = value.toISOString()

            if (element.type === 'time')
                // value = value.substring(11, 8) + 'Z';
                value = value.substring(11, 19) + 'Z';

            switch (valueType) {
                case 'getDayName':
                    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    value = days[value.getDay()];
                    break;
                case 'getMonthName':
                    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    value = months[value.getMonth()];
                    break;
                case 'toUnixTimestamp':
                    value = Math.floor(value.getTime() / 1000);
                    break;
                case 'toLocaleString':
                    let locale = element.getAttribute('locale') || 'en-US'
                    value = value[valueType](locale);
                    break;
                default:
                    if (typeof value[valueType] === 'function') {
                        value = value[valueType]();
                    } else {
                        console.warn(`The method ${valueType} is not a function of Date object.`);
                    }
            }
        }
    } else if (element.tagName == 'INPUT' || element.tagName == 'SELECT') {
        value = element.value;
    } else if (element.tagName == 'TEXTAREA') {
        if (element.hasAttribute('value'))
            value = element.getAttribute('value');
        else
            value = element.value;
    } else if (element.tagName === 'IFRAME') {
        value = element.srcdoc;
    } else if (element.hasAttribute('value')) {
        value = element.getAttribute('value');
    } else if (valueType === 'text') {
        value = element.innerText;
    } else {
        value = element.innerHTML;
    }

    if (valueType === 'boolean') {
        if (!value || value === 'fasle')
            return false
        else
            return true
    }

    if (value === '$organization_id')
        value = localStorage.getItem('organization_id')
    else if (value === '$user_id')
        value = localStorage.getItem('user_id')
    else if (value === '$clientId')
        value = localStorage.getItem('clientId')
    else if (value === '$session_id')
        value = localStorage.getItem('session_id')
    else if (typeof value === 'string') {
        if (value.startsWith('$search')) {
            const searchParams = new URLSearchParams(window.location.search);
            if (value.includes('.')) {
                value = searchParams.get(value.split('.')[1]);
            } else {
                const paramsObject = {};

                // Iterate over all key-value pairs and add them to the object
                for (const [key, value] of searchParams) {
                    paramsObject[key] = value;
                }
                value = paramsObject
            }

        } else if ([
            '$href',
            '$origin',
            '$protocol',
            '$host',
            '$hostname',
            '$port',
            '$pathname',
            '$hash'
        ].includes(value)) {
            value = window.location[value.substring(1)]
        }
    }

    // try {
    //     let replace = element.getAttribute('value-replace');
    //     let replaceAll = element.getAttribute('value-replaceall');

    //     if (replace || replaceAll) {
    //         let { regex, replacement } = regexParser(replace || replaceAll)
    //         if (regex) {
    //             if (replace)
    //                 replace = regex
    //             else if (replaceAll)
    //                 replaceAll = regex
    //         }


    //         replacement = replacement || element.getAttribute('value-replacement') || "";

    //         if (replacement !== undefined) {
    //             if (replace)
    //                 value = value.replace(replace, replacement);
    //             else
    //                 value = value.replaceAll(replaceAll, replacement);
    //         }
    //     }
    // } catch (error) {
    //     console.error('getValue() replace error:', error, element);
    // }

    try {
        let replace = element.getAttribute('value-replace');
        let replaceAll = element.getAttribute('value-replaceall');
        let test = element.getAttribute('value-test');
        let match = element.getAttribute('value-match');
        let split = element.getAttribute('value-split');
        let lastIndex = element.getAttribute('value-lastindex');
        let search = element.getAttribute('value-search');
        let exec = element.getAttribute('value-exec');

        if (replace || replaceAll || test || match || split || lastIndex || search || exec) {
            let { regex, replacement } = regexParser(replace || replaceAll || test || match || split || lastIndex || search || exec);

            if (regex) {
                if (replace)
                    replace = regex;
                else if (replaceAll)
                    replaceAll = regex;
                else if (test)
                    test = regex;
                else if (match)
                    match = regex;
                else if (split)
                    split = regex;
                else if (lastIndex)
                    lastIndex = regex;
                else if (search)
                    search = regex;
                else if (exec)
                    exec = regex;
            }

            replacement = replacement || element.getAttribute('value-replacement') || "";

            if (replacement !== undefined) {
                if (replace) {
                    value = value.replace(replace, replacement);
                } else if (replaceAll) {
                    value = value.replaceAll(replaceAll, replacement);
                }
            }

            if (test) {
                value = regex.test(value);
            }

            if (match) {
                const matches = value.match(match);
                if (matches) {
                    value = matches[1] || matches[0]; // prioritize capturing group match if available
                }
            }

            if (split) {
                value = value.split(split);
            }

            if (lastIndex) {
                regex.lastIndex = 0; // Ensure starting index is 0
                regex.test(value);
                value = regex.lastIndex;
            }

            if (search) {
                value = value.search(search);
            }

            if (exec) {
                const execResult = regex.exec(value);
                if (execResult) {
                    value = execResult[1] || execResult[0]; // prioritize capturing group match if available
                } else {
                    value = null;
                }
            }
        }
    } catch (error) {
        console.error('getValue() error:', error, element);
    }

    let encode = element.getAttribute('value-encode')
    if (encode)
        value = encodeValue(value, encode)

    let decode = element.getAttribute('value-decode')
    if (decode)
        value = decodeValue(value, decode)

    let lowercase = element.getAttribute('value-lowercase')
    if (lowercase || lowercase === '')
        value = value.toLowerCase()
    let uppercase = element.getAttribute('value-uppercase');
    if (uppercase || uppercase === '')
        value = value.toUpperCase()

    if (!Array.isArray(value)) {
        if (prefix || suffix)
            value = prefix + value + suffix;

        if (valueType == 'array')
            value = [value];
    }

    if (value && (valueType == 'object' || valueType == 'json')) {
        try {
            value = JSON.parse(value)
        } catch (error) {
            value = value
        }
    }

    return value;

};

function regexParser(string) {
    let regex, replacement;
    let regexMatch = string.match(/\/(.+)\/([gimuy]*)/);
    if (regexMatch) {
        regex = new RegExp(regexMatch[1], regexMatch[2]);
        const splitReplace = string.split(', ');
        replacement = splitReplace.length > 1 ? splitReplace[1].slice(1, -1) : "";
    }

    return { regex, replacement }
}

function encodeValue(value, encodingType) {
    switch (encodingType.toLowerCase()) {
        case 'url':
        case 'uri':
            return encodeURI(value.replace(/ /g, "%20"));
        case 'uri-component':
            return encodeURIComponent(value.replace(/ /g, "%20"));
        case 'base64':
        case 'atob':
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(value);
            return btoa(String.fromCharCode(...uint8Array));
        case 'html-entities':
            return value.replace(/[\u00A0-\u9999<>\&]/g, (i) => {
                return `&#${i.charCodeAt(0)};`;
            });
        case 'json':
            return JSON.stringify(value);
        default:
            throw new Error(`Unsupported encoding type: ${encodingType}`);
    }
}

function decodeValue(value, decodingType) {
    switch (decodingType.toLowerCase()) {
        case 'url':
        case 'uri':
            return decodeURI(value);
        case 'uri-component':
            return decodeURIComponent(value);
        case 'base64':
        case 'btoa': // New case for Base64 decoding (alias for 'base64')
            try {
                const decodedArray = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
                const decoder = new TextDecoder();
                return decoder.decode(decodedArray);
            } catch (error) {
                throw new Error(`Invalid Base64 string: ${error.message}`);
            }
        case 'html-entities':
            const tempElement = document.createElement('div');
            tempElement.innerHTML = value;
            return tempElement.textContent;
        case 'json':
            try {
                return JSON.parse(value);
            } catch (error) {
                throw new Error(`Invalid JSON string: ${error.message}`);
            }
        default:
            throw new Error(`Unsupported decoding type: ${decodingType}`);
    }
}

export { getValue, storage };
