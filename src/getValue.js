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
    let value = element.value || element.getAttribute('value')
    if (element.hasAttribute('component') || element.hasAttribute('plugin')) {
        value = storage.get(element)
        storage.delete(element)
        return value
    }

    let prefix = element.getAttribute('value-prefix') || "";
    let suffix = element.getAttribute('value-suffix') || "";

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
            if (element.checked)
                value = element.value || 'true'
            else if (!element.value)
                value = 'false'

        }
    } else if (element.type === 'radio') {
        let key = element.getAttribute('key');
        value = document.querySelector(`input[key="${key}"]:checked`).value
    } else if (element.type === "number") {
        value = Number(value);
    } else if (element.type === 'range') {
        value = [Number(element.min), Number(element.value)];
    } else if (element.type === "password") {
        value = btoa(value);
    } else if (element.tagName == "SELECT" && element.hasAttribute('multiple')) {
        let options = element.selectedOptions;
        value = [];
        for (let i = 0; i < options.length; i++) {
            let optionValue = options[i].value
            if (prefix || suffix)
                optionValue = prefix + optionValue + suffix;
            value.push(optionValue);
        }
    } else if (["time", "datetime", "datetime-local"].includes(element.type)) {
        value = new Date(value).toISOString();
        if (el.type === 'time')
            value = value.substring(11, 8) + 'Z';
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
    } else {
        value = element.innerHTML;
    }

    let valueType = element.getAttribute('value-type');
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

export { getValue, storage };
