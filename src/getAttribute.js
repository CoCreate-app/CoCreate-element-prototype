// Store a reference to the original getAttribute function
const originalGetAttribute = Element.prototype.getAttribute;

// Override the getAttribute function
Element.prototype.getAttribute = function (name) {
    let value = originalGetAttribute.call(this, name);

    if (value === '$organization_id')
        value = localStorage.getItem('organization_id')
    else if (value === '$user_id')
        value = localStorage.getItem('user_id')
    else if (value === '$clientId')
        value = localStorage.getItem('clientId')
    else if (value === '$session_id')
        value = localStorage.getItem('session_id')
    else if (value === '$innerWidth')
        value = window.innerWidth
    else if (value === '$innerHeight')
        value = window.innerHeight
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

    return value;
};

