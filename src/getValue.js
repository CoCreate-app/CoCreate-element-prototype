import { processOperators } from "./utility";

const storage = new Map();

HTMLElement.prototype.getValue = function () {
	let value = getValue(this);
	return value;
};

// TODO: check if using a a switch case will provide better performance
// return blobs for element.src and for link.href
// pass value type as a param
const getValue = (element) => {
	let value = element.value || element.getAttribute("value") || "";
	if (
		element.hasAttribute("component") ||
		element.hasAttribute("plugin") ||
		element.type === "file" ||
		element.getAttribute("type") === "file"
	) {
		value = storage.get(element);
		storage.delete(element);
		return value;
	}

	let prefix = element.getAttribute("value-prefix") || "";
	let suffix = element.getAttribute("value-suffix") || "";
	let valueType = element.getAttribute("value-type") || "";

	if (element.type === "checkbox") {
		let inputs = [element];
		let key = element.getAttribute("key");
		if (key)
			inputs = document.querySelectorAll(
				`input[type="${element.type}"][key="${key}"]`
			);

		if (inputs.length > 1) {
			value = [];
			inputs.forEach((el) => {
				if (el.checked) {
					let checkedValue = el.value;
					if (prefix || suffix)
						checkedValue = prefix + checkedValue + suffix;

					value.push(checkedValue);
				}
			});
		} else {
			if (element.checked) {
				if (element.hasAttribute("value"))
					value = element.value || true;
				else value = true;
			} else value = false;
		}
	} else if (element.type === "radio") {
		let key = element.getAttribute("key");
		value = document.querySelector(`input[key="${key}"]:checked`).value;
	} else if (element.type === "number") {
		value = Number(value);
	} else if (element.type === "range") {
		if (Number(element.min))
			value = [Number(element.min), Number(element.value)];
		else value = Number(element.value);
	} else if (element.type === "password") {
		value = btoa(value || "");
	} else if (element.type === "email") {
		value = value.toLowerCase();
	} else if (element.type === "url") {
		// TODO: define attributes to return url parts
		// return as a string or an object of url parts
	} else if (
		element.tagName == "SELECT" &&
		element.hasAttribute("multiple")
	) {
		let options = element.selectedOptions;
		value = [];
		for (let i = 0; i < options.length; i++) {
			let optionValue = options[i].value;
			if (prefix || suffix) optionValue = prefix + optionValue + suffix;
			value.push(optionValue);
		}
	} else if (
		["time", "date", "datetime", "datetime-local"].includes(
			element.getAttribute("type")
		)
	) {
		if (value === "$now") value = new Date();
		else if (value) value = new Date(value);

		if (value) {
			if (!valueType) value = value.toISOString();

			if (element.type === "time")
				// value = value.substring(11, 8) + 'Z';
				value = value.substring(11, 19) + "Z";

			if (valueType) {
				switch (valueType) {
					case "getDayName":
						const days = [
							"Sunday",
							"Monday",
							"Tuesday",
							"Wednesday",
							"Thursday",
							"Friday",
							"Saturday"
						];
						value = days[value.getDay()];
						break;
					case "getMonthName":
						const months = [
							"January",
							"February",
							"March",
							"April",
							"May",
							"June",
							"July",
							"August",
							"September",
							"October",
							"November",
							"December"
						];
						value = months[value.getMonth()];
						break;
					case "toUnixTimestamp":
						value = Math.floor(value.getTime() / 1000);
						break;
					case "toLocaleString":
						let locale = element.getAttribute("locale") || "en-US";
						value = value[valueType](locale);
						break;
					default:
						if (typeof value[valueType] === "function") {
							value = value[valueType]();
						} else {
							console.warn(
								`The method ${valueType} is not a function of Date object.`
							);
						}
				}
			}
		}
	} else if (element.tagName == "INPUT" || element.tagName == "SELECT") {
		value = element.value;
	} else if (element.tagName == "TEXTAREA") {
		if (element.hasAttribute("value"))
			value = element.getAttribute("value");
		else value = element.value;
	} else if (element.tagName === "IFRAME") {
		value = element.srcdoc;
	} else if (element.hasAttribute("value")) {
		value = element.getAttribute("value");
	} else {
		let targetElement = element;

		// If value-exclude-selector exists, clone the element and remove the specified selectors
		const excludeSelector = element.getAttribute("value-remove-selector");
		if (excludeSelector) {
			targetElement = element.cloneNode(true);

			// Remove matching elements from the cloned element
			targetElement
				.querySelectorAll(excludeSelector)
				.forEach((el) => el.remove());
		}

		// Determine whether to use outerHTML, innerHTML, or innerText based on valueType
		if (valueType === "text") {
			value = targetElement.innerText;
		} else if (valueType === "outerHTML") {
			value = targetElement.outerHTML;
		} else if (valueType === "element" || valueType === "node") {
			value = targetElement.outerHTML;
		} else {
			value = targetElement.innerHTML;
		}
	}

	if (valueType === "boolean") {
		if (!value || value === "fasle") return false;
		else return true;
	}

	value = processOperators(element, value, ["$value"]);

	try {
		const attributes = element.attributes; // Get all attributes of the element
		const regexAttribute = [
			"value-replace",
			"value-replaceall",
			"value-test",
			"value-match",
			"value-split",
			"value-lastindex",
			"value-search",
			"value-exec"
		];
		// Process each attribute in order
		for (let i = 0; i < attributes.length; i++) {
			if (value === null || value === undefined) break;

			if (!regexAttribute.includes(attributes[i].name)) continue;

			let regexAttributeValue = attributes[i].value;

			if (!regexAttributeValue) continue;

			let { regex, replacement } = regexParser(regexAttributeValue);

			if (regex) regexAttributeValue = regex;

			replacement =
				replacement || element.getAttribute("value-replacement") || "";

			switch (attributes[i].name) {
				case "value-replace":
					value = value.replace(regexAttributeValue, replacement);
					break;

				case "value-replaceall":
					value = value.replaceAll(regexAttributeValue, replacement);
					break;

				case "value-test":
					value = regex.test(value);
					break;

				case "value-match":
					const matches = value.match(regexAttributeValue);
					if (matches) {
						value = matches[1] || matches[0]; // Prioritize capturing group if available
					}
					break;

				case "value-split":
					value = value.split(regexAttributeValue);
					break;

				case "value-lastindex":
					regex.lastIndex = 0; // Ensure starting index is 0
					regex.test(value);
					value = regex.lastIndex;
					break;

				case "value-search":
					value = value.search(regexAttributeValue);
					break;

				case "value-exec":
					const execResult = regex.exec(value);
					if (execResult) {
						value = execResult[1] || execResult[2] || execResult[0]; // Prioritize capturing group if available
					} else {
						// value = null;
					}
					break;

				default:
					// Ignore other attributes
					break;
			}
		}
	} catch (error) {
		console.error("getValue() error:", error, element);
	}

	// TODO: encode and decode needs a method to prevent multiple encode of an already encoded value
	let encode = element.getAttribute("value-encode");
	if (encode) value = encodeValue(value, encode);

	let decode = element.getAttribute("value-decode");
	if (decode) value = decodeValue(value, decode);

	let lowercase = element.getAttribute("value-lowercase");
	if (lowercase || lowercase === "") value = value.toLowerCase();
	let uppercase = element.getAttribute("value-uppercase");
	if (uppercase || uppercase === "") value = value.toUpperCase();

	// Apply prefix and suffix first, before JSON parsing
	if (typeof value === "string" || typeof value === "number") {
		if (prefix || suffix) {
			value = prefix + value + suffix;
		}
	}

	// Handle JSON parsing for objects, arrays, or when valueType starts with 'array'
	if (
		value &&
		(valueType === "object" ||
			valueType === "json" ||
			valueType.startsWith("array"))
	) {
		try {
			value = JSON.parse(value);
		} catch (error) {
			const jsonRegex = /(\{[\s\S]*\}|\[[\s\S]*\])/;
			const match = value.match(jsonRegex);

			if (match) {
				try {
					value = JSON.parse(match[0]);
				} catch (e) {
					console.error(
						"Failed to parse JSON after regex extraction:",
						e
					);
				}
			} else {
				console.error("No valid JSON structure found in the string.");
			}
		}
	}

	// Now handle array-specific logic if valueType starts with 'array'
	if (valueType.startsWith("array")) {
		if (!Array.isArray(value)) {
			// If the parsed value is an object, apply array conversion based on operators
			if (typeof value === "object") {
				if (valueType === "array.$keys") {
					value = Object.keys(value);
				} else if (valueType === "array.$values") {
					value = Object.values(value);
				} else if (valueType === "array.$entries") {
					value = Object.entries(value);
				} else {
					// Default behavior: wrap the object in an array
					value = [value];
				}
			} else {
				// If it's not an object (i.e., a primitive), wrap the value in an array
				value = [value];
			}
		}
	}

	return value;
};

function regexParser(string) {
	let regex, replacement;
	// Match a regex pattern enclosed by delimiters or a bare regex string
	// 	let regexMatch = string.match(/^\/(.+)\/([gimuy]*)$/) || [null, string, ""];

	let regexMatch = string.match(/\/(.+)\/([gimuy]*)/);
	if (regexMatch) {
		regex = new RegExp(regexMatch[1], regexMatch[2]);
		const splitReplace = string.split(", ");
		replacement =
			splitReplace.length > 1 ? splitReplace[1].slice(1, -1) : "";
	}

	return { regex, replacement };
}

function encodeValue(value, encodingType) {
	switch (encodingType.toLowerCase()) {
		case "url":
		case "uri":
			return encodeURI(value.replace(/ /g, "%20"));
		case "uri-component":
			return encodeURIComponent(value.replace(/ /g, "%20"));
		case "base64":
		case "atob":
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(value);
			return btoa(String.fromCharCode(...uint8Array));
		case "html-entities":
			return value.replace(/[\u00A0-\u9999<>\&]/g, (i) => {
				return `&#${i.charCodeAt(0)};`;
			});
		case "json":
			return JSON.stringify(value);
		default:
			throw new Error(`Unsupported encoding type: ${encodingType}`);
	}
}

function decodeValue(value, decodingType) {
	switch (decodingType.toLowerCase()) {
		case "url":
		case "uri":
			return decodeURI(value);
		case "uri-component":
			return decodeURIComponent(value);
		case "base64":
		case "btoa": // New case for Base64 decoding (alias for 'base64')
			try {
				const decodedArray = Uint8Array.from(atob(value), (c) =>
					c.charCodeAt(0)
				);
				const decoder = new TextDecoder();
				return decoder.decode(decodedArray);
			} catch (error) {
				throw new Error(`Invalid Base64 string: ${error.message}`);
			}
		case "html-entities":
			const tempElement = document.createElement("div");
			tempElement.innerHTML = value;
			return tempElement.textContent;
		case "json":
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
