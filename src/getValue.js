import { processOperators } from "./operators";

const storage = new Map();

HTMLElement.prototype.getValue = function () {
	let value = getValue(this);
	return value;
};

// TODO: return blobs for element.src and for link.href (Not addressed)

/**
 * Retrieves and processes the value from an HTML element based on its type and additional attributes.
 *
 * @param {HTMLElement} element - The HTML element to process for its value.
 * @param {string} valueType - Optional. The expected type that defines how the value should be processed.
 * @returns {any} - The processed value based on the element's type and attributes.
 */
const getValue = (element, valueType) => {
	// If no valueType is given, attempt to retrieve it from the element's attributes
	if (!valueType) {
		valueType = element.getAttribute("value-type") || "";
	}

	// Initialize value with element's value property or its 'value' attribute, defaulting to an empty string
	let value = element.value || element.getAttribute("value") || "";

	// Handle specific cases for elements considered components, plugins, or file inputs
	if (
		element.hasAttribute("component") ||
		element.hasAttribute("plugin") ||
		element.type === "file" ||
		element.getAttribute("type") === "file"
	) {
		// Retrieve and delete value from storage for secure data handling
		value = storage.get(element);
		storage.delete(element);
		return value;
	}

	// Retrieve prefix and suffix from attributes for later use
	let prefix = element.getAttribute("value-prefix") || "";
	let suffix = element.getAttribute("value-suffix") || "";

	// Determine elementType using type first, fallback to tagName (both lowercase and uppercase respectively)
	// const elementType = element.type ? element.type.toLowerCase() : null;
	const elementType =  element.getAttribute("type") || element.type
	const tagName = element.tagName.toUpperCase();

	// Switch statement to handle different element types and tagNames
	switch (elementType) {
		case "checkbox":
			// Handles multiple checkboxes in a group using a key and applies prefix/suffix if needed
			value = handleCheckbox(element, prefix, suffix);
			break;

		case "radio":
			const key = element.getAttribute("key");
			// Handles radio inputs by selecting the checked radio's value in the group with the same key
			let el = document.querySelector(`input[key="${key}"]:checked`);
			if (el) {
				value = el.value;
			}
			break;

		case "number":
			// Converts the value to a number for inputs of type number
			value = Number(value);
			break;

		case "range":
			// If a minimum is specified, returns a range array, otherwise a single number
			value = element.min
				? [Number(element.min), Number(element.value)]
				: Number(element.value);
			break;

		case "password":
			// Encodes the value in Base64 format for password inputs for secure representation
			value = btoa(value || "");
			break;

		case "email":
			// Converts the email to lowercase to maintain a standardized format
			value = value.toLowerCase();
			break;

		case "url":
			// TODO: Implement logic to return URL parts instead of the complete URL
			break;

		case "time":
		case "date":
		case "datetime":
		case "datetime-local":
			// Processes datetime-related inputs with custom logic
			value = handleDateTime(element, value, valueType);
			break;
		default:
			switch (tagName) {
				case "INPUT":
					// For generic input types, use the element's value
					value = element.value;
					break;

				case "SELECT":
					// Handles multiple selection in select elements, applying prefix/suffix if required
					value = element.hasAttribute("multiple")
						? handleMultipleSelect(element, prefix, suffix)
						: element.value;
					break;

				case "TEXTAREA":
					// For textarea elements, preference is given to the 'value' attribute if it exists
					value = element.hasAttribute("value")
						? element.getAttribute("value")
						: element.value;
					break;

				case "IFRAME":
					// For iframes, return the document source
					value = element.srcdoc;
					break;

				default:
					// Handles cases not explicitly matched by type or tagName
					value = handleElement(element, valueType);
					break;
			}
			break;
	}

	// If the desired valueType is boolean, convert the value accordingly
	if (valueType === "boolean") {
		return value && value !== "false";
	}

	// Apply additional processing through a series of transformation functions
	if (value) {
		value = processOperators(element, value, ["$value"]);
		value = caseHandler(element, value);
		value = regex(element, value);
		value = encodeValue(value, element.getAttribute("value-encode") || "");
		value = decodeValue(value, element.getAttribute("value-decode") || "");
	}

	// Append prefix and suffix to value if applicable, before JSON parsing
	if (typeof value === "string" || typeof value === "number") {
		if (prefix || suffix) {
			value = prefix + value + suffix;
		}
	}

	// Parse the value as JSON, if possible, and convert to an array if needed
	value = parseJson(value, valueType);
	value = toArray(value, valueType);

	return value; // Return the final processed value
};

/**
 * Processes a checkbox or a group of checkboxes to determine their checked values.
 * For multiple checkboxes with the same key, their checked values are collected into an array.
 *
 * @param {HTMLInputElement} element - The input element of type checkbox.
 * @param {string} prefix - A string to prepend to each checked value.
 * @param {string} suffix - A string to append to each checked value.
 * @returns {string|boolean|Array} - The value(s) of checked checkbox(es), or `false` if none are checked.
 */
const handleCheckbox = (element, prefix = "", suffix = "") => {
	// Retrieve all checkboxes with the same key, else just the single element
	const inputs = element.getAttribute("key")
		? document.querySelectorAll(
				`input[type="${element.type}"][key="${element.getAttribute(
					"key"
				)}"]`
		  )
		: [element];

	if (inputs.length === 1) {
		// If only one checkbox, return its value or true/false depending on its checked state
		return element.checked ? element.value || true : false;
	} else {
		// For multiple checkboxes, collect their checked values into an array
		return Array.from(inputs)
			.filter((el) => el.checked) // Filter only checked elements
			.map((el) => `${prefix}${el.value}${suffix}`); // Apply prefix/suffix and collect values
	}
};

/**
 * Handles and transforms a date/time value based on the specified valueType.
 * Supports operations like converting to ISO string, extracting day/month names, converting to Unix timestamp, and more.
 *
 * @param {HTMLElement} element - The DOM element containing the date/time value.
 * @param {string} value - The initial value which may represent a date/time.
 * @param {string} valueType - Specifies the type of transformation to apply to the date/time value.
 * @returns {any} - The transformed or processed date/time value.
 */
/**
 * Handles and transforms a date/time value with a 3-step pipeline:
 * 1. SNAP: Adjusts date to start/end of periods (Month, Week, Year).
 * 2. MATH: Adds/Subtracts Years, Months, Weeks, Days, Hours, Minutes, Seconds.
 * 3. FORMAT: Returns the final string/number representation.
 */
const handleDateTime = (element, value, valueType) => {
	const inputType = (element.getAttribute("type") || element.type || "").toLowerCase();
	let date;
	if (value === "$now") {
		date = new Date();
	} else if (value instanceof Date) {
		// If it's already a date object, clone it to avoid mutating references
		date = new Date(value.getTime());
	} else if (value) {
		if (
			typeof value === "string" &&
			/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
				value
			)
		) {
			// Normalize datetime-local only when seconds are absent; preserve provided seconds.
			if (inputType === "datetime-local" && /^[0-9T:-]{16}$/.test(value)) {
				value = `${value}:00`;
			}
			date = new Date(value);
		} else {
			date = new Date(value);
		}
	} else {
		console.warn("Provided date is invalid:", value);
		return "";
	}

	if (date instanceof Date && !isNaN(date.getTime())) {
		// These operations "floor" or "ceil" the date to a specific boundary.
		switch (valueType) {
			case "startOfDay":
				date.setHours(0, 0, 0, 0);
				break;
			case "startOfWeek":
				const startWkOff = parseInt(
					element.getAttribute("week-start-day") || 0,
					10
				);
				date.setDate(date.getDate() - date.getDay() + startWkOff);
				date.setHours(0, 0, 0, 0);
				break;
			case "endOfWeek":
				const endWkOff = parseInt(
					element.getAttribute("week-start-day") || 0,
					10
				);
				date.setDate(date.getDate() - date.getDay() + 6 + endWkOff);
				date.setHours(23, 59, 59, 999);
				break;
			case "startOfMonth":
				date.setDate(1);
				date.setHours(0, 0, 0, 0);
				break;
			case "endOfMonth":
				date.setMonth(date.getMonth() + 1, 0);
				date.setHours(23, 59, 59, 999);
				break;
			case "startOfYear":
				date.setMonth(0, 1);
				date.setHours(0, 0, 0, 0);
				break;
			case "endOfYear":
				date.setMonth(11, 31);
				date.setHours(23, 59, 59, 999);
				break;
		}

		// --- PHASE 3: MATH (Modify the Date) 
		// Helper to get integer value from attribute safely
		const getVal = (attr) =>
			parseInt(element.getAttribute(attr) || "0", 10);

		// 1. Years
		const addYears = getVal("add-years") - getVal("subtract-years");
		if (addYears) date.setFullYear(date.getFullYear() + addYears);

		// 2. Months
		const addMonths = getVal("add-months") - getVal("subtract-months");
		if (addMonths) date.setMonth(date.getMonth() + addMonths);

		// 3. Weeks
		const addWeeks = getVal("add-weeks") - getVal("subtract-weeks");
		if (addWeeks) date.setDate(date.getDate() + addWeeks * 7);

		// 4. Days
		const addDays = getVal("add-days") - getVal("subtract-days");
		if (addDays) date.setDate(date.getDate() + addDays);

		// 5. Hours
		const addHours = getVal("add-hours") - getVal("subtract-hours");
		if (addHours) date.setHours(date.getHours() + addHours);

		// 6. Minutes
		const addMinutes = getVal("add-minutes") - getVal("subtract-minutes");
		if (addMinutes) date.setMinutes(date.getMinutes() + addMinutes);

		// 7. Seconds
		const addSeconds = getVal("add-seconds") - getVal("subtract-seconds");
		if (addSeconds) date.setSeconds(date.getSeconds() + addSeconds);


		// --- PHASE 4: FORMATTING (Output the Result) ---
		switch (valueType) {
			case "getDayName":
				const days = [
					"Sunday",
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
				];
				return days[date.getDay()];

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
					"December",
				];
				return months[date.getMonth()];

			case "getYear":
			case "getFullYear":
				return date.getFullYear();

			case "toUnixTimestamp":
				return Math.floor(date.getTime() / 1000);

			case "toLocaleString":
				const locale = element.getAttribute("locale") || "en-US";
				return date.toLocaleString(locale);

			default:
				// Handle generic methods if specified
				if (valueType && typeof date[valueType] === "function") {
					return date[valueType]();
				}

				const pad = (n) => String(n).padStart(2, "0");
				if (inputType === "datetime-local") {
					// Return a datetime-local compatible string with seconds to avoid invalid values
					return `${date.getFullYear()}-${pad(
						date.getMonth() + 1
					)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
						date.getMinutes()
					)}:${pad(date.getSeconds())}`;
				}
				return date.toISOString();
		}
	}
};

/**
 * Processes a <select> HTML element with the "multiple" attribute to retrieve an array of selected option values.
 * Each selected value can have a prefix or suffix added to it if specified.
 *
 * @param {HTMLSelectElement} element - The select element with multiple options that are possibly selected.
 * @param {string} prefix - A string to prepend to each selected option value.
 * @param {string} suffix - A string to append to each selected option value.
 * @returns {string[]} - An array of selected option values, each optionally prefixed and suffixed.
 */
const handleMultipleSelect = (element, prefix, suffix) => {
	// Initialize an empty array to hold the values of selected options.
	let value = [];

	// Retrieve all selected options from the select element.
	let options = element.selectedOptions;

	// Iterate over each selected option.
	for (let i = 0; i < options.length; i++) {
		// Retrieve the value of the current option.
		let optionValue = options[i].value;

		// If a prefix or suffix is provided, modify the option value accordingly.
		if (prefix || suffix) {
			optionValue = prefix + optionValue + suffix;
		}

		// Add the processed option value to the array.
		value.push(optionValue);
	}

	// Return the array of processed option values.
	return value;
};

/**
 * Retrieves a specific value from an HTML element based on the specified valueType.
 * If the element has a "value" attribute, it returns its value. Otherwise, it processes
 * the element to extract or format the desired information based on the valueType.
 *
 * @param {HTMLElement} element - The DOM element to process.
 * @param {string} valueType - The type of value to retrieve (e.g., "text", "outerHTML").
 * @returns {string} - The extracted value based on the specified valueType.
 */
const handleElement = (element, valueType) => {
	// Check if the element has a "value" attribute; if so, return its value.
	if (element.hasAttribute("value")) {
		return element.getAttribute("value");
	}

	// Use the original element as the target by default.
	let targetElement = element;
	// Retrieve the "value-remove-query" attribute used to specify selectors that should be removed.
	const excludeSelector = element.getAttribute("value-remove-query");

	// If there is an excludeSelector, clone the element and remove elements matching the selector.
	if (excludeSelector) {
		// Clone the element to avoid modifying the original DOM.
		targetElement = element.cloneNode(true);
		// Find and remove all elements that match the excludeSelector from the cloned element.
		targetElement
			.querySelectorAll(excludeSelector)
			.forEach((el) => el.remove());
	}

	// Determine the value to return based on the valueType.
	switch (valueType) {
		case "text":
			// Return the text content of the target element.
			return targetElement.innerText;
		case "outerHTML":
		case "element":
		case "node":
			// For these cases, return the outer HTML of the target element.
			return targetElement.outerHTML;
		default:
			// By default, return the inner HTML of the target element.
			return targetElement.innerHTML;
	}
};

/**
 * Modifies the case of `value` based on specific attributes in `element`.
 * Converts to lowercase or uppercase if attributes are present and not "false".
 *
 * @param {HTMLElement} element - The DOM element to check for attributes.
 * @param {string} value - The value to adjust based on the attributes.
 * @returns {string} - The adjusted value.
 */
function caseHandler(element, value) {
	// Convert to lowercase if "value-lowercase" is set and not "false"
	const lowercase = element.getAttribute("value-lowercase");
	if (lowercase !== null && lowercase !== "false") {
		value = value.toLowerCase();
	}

	// Convert to uppercase if "value-uppercase" is set and not "false"
	const uppercase = element.getAttribute("value-uppercase");
	if (uppercase !== null && uppercase !== "false") {
		value = value.toUpperCase();
	}

	return value;
}

/**
 * Processes the value by applying regex-based transformations specified by certain attributes on an element.
 * Attributes dictate regex operations such as replace, match, split, etc.
 *
 * @param {HTMLElement} element - The DOM element whose attributes specify regex operations.
 * @param {string} value - The value to be transformed based on regex operations.
 * @returns {string} - The transformed value, or the original value if an error occurs.
 */
function regex(element, value) {
	try {
		const attributes = element.attributes; // Retrieve all attributes of the element

		// Define a list of attributes that specify regex operations
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

		// Iterate over element attributes and process ones related to regex operations
		for (let i = 0; i < attributes.length; i++) {
			// Stop processing if value is null or undefined
			if (value === null || value === undefined) break;

			// Skip attributes that do not relate to regex operations
			if (!regexAttribute.includes(attributes[i].name)) continue;

			let regexAttributeValue = attributes[i].value; // The attribute value containing regex pattern

			// Skip processing for empty regex attributes
			if (!regexAttributeValue) continue;

			// Parse the regex pattern and replacement from the attribute value
			let { regex, replacement } = regexParser(regexAttributeValue);

			// Use parsed regex if available
			if (regex) regexAttributeValue = regex;

			// Default to an empty string for replacement if not specified
			replacement =
				replacement || element.getAttribute("value-replacement") || "";

			// Execute the determined regex operation
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
						value = matches[1] || matches[0]; // Use capturing group if available
					}
					break;
				case "value-split":
					value = value.split(regexAttributeValue);
					break;
				case "value-lastindex":
					regex.lastIndex = 0; // Ensure the starting index is reset
					regex.test(value);
					value = regex.lastIndex;
					break;
				case "value-search":
					value = value.search(regexAttributeValue);
					break;
				case "value-exec":
					const execResult = regex.exec(value);
					if (execResult) {
						value = execResult[1] || execResult[2] || execResult[0]; // Prioritize capturing groups
					}
					break;
				default:
					// Unknown attribute, ignored
					break;
			}
		}

		// Return the transformed value
		return value;
	} catch (error) {
		// Log a warning since the transformation error is non-critical, but should be noted
		console.warn(
			"Warning: Transformation error during regex operation:",
			error,
			element
		);
		return value; // Return the original value to maintain application flow
	}
}

/**
 * Parses a string to extract a regular expression and a replacement string.
 * Assumes the input string may contain a regex pattern in the form "/pattern/flags"
 * and an optional replacement string separated by a comma.
 *
 * @param {string} string - The input string potentially containing a regex pattern and a replacement.
 * @returns {Object} An object containing the `regex` (RegExp object) and `replacement` (string).
 */
function regexParser(string) {
	let regex, replacement;

	// Match a regex pattern defined as /pattern/flags within the input string.
	// It captures the pattern and the flags (e.g., 'g' for global, 'i' for case-insensitive).
	let regexMatch = string.match(/\/(.+)\/([gimuy]*)/);

	// If a regex pattern is found in the string, proceed to create the RegExp object
	if (regexMatch) {
		// Create a new RegExp object using the captured pattern and flags
		regex = new RegExp(regexMatch[1], regexMatch[2]);

		// Split the input string on ", " to separate the pattern from a replacement string
		const splitReplace = string.split(", ");

		// Check if there's a replacement string provided. If so, trim the surrounding spaces.
		replacement =
			splitReplace.length > 1 ? splitReplace[1].slice(1, -1) : "";
	}

	// Return an object containing the parsed regex and replacement string
	return { regex, replacement };
}

/**
 * Encodes the given value using the specified encoding type.
 *
 * @param {string} value - The value to be encoded.
 * @param {string} encodingType - The type of encoding to apply. Accepted values include "url", "uri-component", "base64", "html-entities", and "json".
 * @returns {string} - The encoded value or the original value if encoding type is unsupported.
 */
function encodeValue(value, encodingType) {
	if (!encodingType) {
		return value;
	}

	// Determine the encoding method based on the case-insensitive encodingType
	switch (encodingType.toLowerCase()) {
		case "url":
		case "uri":
			// Encode spaces as "%20" explicitly and use encodeURI for overall URL encoding (excluding special characters like '?', '&', '/')
			return encodeURI(value.replace(/ /g, "%20"));

		case "uri-component":
			// Encode spaces as "%20" explicitly and use encodeURIComponent for more thorough encoding, including special characters
			return encodeURIComponent(value.replace(/ /g, "%20"));

		case "base64":
		case "atob":
			try {
				// Create a TextEncoder to convert the value into a Uint8Array, then encode it in base64
				const encoder = new TextEncoder();
				const uint8Array = encoder.encode(value);
				return btoa(String.fromCharCode(...uint8Array));
			} catch (error) {
				console.warn(`Failed to encode as Base64: ${error.message}`);
				return value; // Return the original value as a fallback
			}

		case "html-entities":
			// Replace specific HTML entities with their corresponding character codes using regex
			return value.replace(/[\u00A0-\u9999<>\&]/g, (i) => {
				return `&#${i.charCodeAt(0)};`;
			});

		case "json":
			try {
				// Convert the value to a JSON string representation
				return JSON.stringify(value);
			} catch (error) {
				console.warn(`Failed to convert to JSON: ${error.message}`);
				return value; // Return the original value as a fallback
			}

		default:
			// Log a warning for unsupported encoding types and return the original value
			console.warn(`Unsupported encoding type: ${encodingType}`);
			return value;
	}
}

/**
 * Decodes the given value using the specified decoding type.
 *
 * @param {string} value - The value to be decoded.
 * @param {string} decodingType - The type of decoding to apply. Accepted values include "url", "uri-component", "base64", "html-entities", and "json".
 * @returns {string} - The decoded value or the original value if decoding failed.
 */
function decodeValue(value, decodingType) {
	if (!decodingType) {
		return value;
	}

	switch (decodingType.toLowerCase()) {
		case "url":
		case "uri":
			return decodeURI(value);

		case "uri-component":
			return decodeURIComponent(value);

		case "base64":
		case "btoa": // Alias for Base64 decoding
			try {
				const decodedArray = Uint8Array.from(atob(value), (c) =>
					c.charCodeAt(0)
				);
				const decoder = new TextDecoder();
				return decoder.decode(decodedArray);
			} catch (error) {
				console.warn(`Failed to decode Base64: ${error.message}`);
				return value; // Return the original value as a fallback
			}

		case "html-entities":
			const tempElement = document.createElement("div");
			tempElement.innerHTML = value;
			return tempElement.textContent;

		case "json":
			try {
				return JSON.parse(value);
			} catch (error) {
				console.warn(`Failed to parse JSON: ${error.message}`);
				return value; // Return the original value as a fallback
			}

		default:
			console.warn(`Unsupported decoding type: ${decodingType}`);
			return value; // Return the original value as a fallback
	}
}

/**
 * Parses a string into a JSON object if the provided valueType suggests it might be JSON.
 * Handles objects, arrays, or types starting with 'array'. If parsing fails,
 * attempts to extract a JSON structure using regex and tries again.
 *
 * @param {string} value - The string value that might contain JSON data.
 * @param {string} valueType - A string indicating the expected type of the value (e.g., "object", "json", "array").
 * @returns {any} The parsed JSON object/array or the original value if parsing fails.
 */
function parseJson(value, valueType) {
	// Check if the value is present and if the valueType suggests it could be a JSON structure
	if (
		value && // Ensure there is a value to parse
		(valueType === "object" || // Check if the type is explicitly an object
			valueType === "json" || // Check if the type is explicitly JSON
			valueType.startsWith("array")) // Check if the type indicates an array or complex array structure
	) {
		try {
			// Attempt to parse the value directly as JSON
			value = JSON.parse(value);
		} catch {
			// If direct JSON parsing fails, attempt to extract a potential JSON structure using a regex
			const jsonRegex = /(\{[\s\S]*}|\[[\s\S]*\])/; // Regex to find JSON objects or arrays
			const match = value.match(jsonRegex); // Search the value for JSON-like patterns

			if (match) {
				try {
					// If a pattern is found, attempt to parse the extracted potential JSON
					value = JSON.parse(match[0]);
				} catch {
					// Warn if parsing still fails after extracting potential JSON
					console.warn(
						"Warning: Failed to parse JSON after extraction. Returning original value."
					);
				}
			} else {
				// Warn if no valid JSON structure is found in the string
				console.warn(
					"Warning: No valid JSON structure found in the string. Returning original value."
				);
			}
		}
	}
	return value; // Return the transformed value, or the original if no transformation occurs
}

/**
 * Processes a value by converting it to an array or extracting specific array-related elements.
 * @param {any} value - The value to be processed, potentially an object or primitive.
 * @param {string} valueType - A string indicating the type of conversion or extraction to perform.
 * @returns {Array} - The processed value as an array, or a transformed array-like structure.
 */
function toArray(value, valueType) {
	// Now handle array-specific logic if valueType starts with 'array'
	if (valueType.startsWith("array")) {
		// If the value isn't already an array, convert it accordingly
		if (!Array.isArray(value)) {
			// If the parsed value is an object, apply array conversion based on operators
			if (typeof value === "object") {
				if (valueType === "array.$keys") {
					value = Object.keys(value); // Extracts keys
				} else if (valueType === "array.$values") {
					value = Object.values(value); // Extracts values
				} else if (valueType === "array.$entries") {
					value = Object.entries(value); // Extracts entries as [key, value]
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
}

export { getValue, storage };
