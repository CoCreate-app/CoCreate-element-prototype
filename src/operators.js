import { ObjectId, queryElements } from "@cocreate/utils";

// Operators handled directly for simple, synchronous value retrieval
const customOperators = new Map(
	Object.entries({
		$organization_id: () => localStorage.getItem("organization_id"),
		$user_id: () => localStorage.getItem("user_id"),
		$clientId: () => localStorage.getItem("clientId"),
		$session_id: () => localStorage.getItem("session_id"),
		$value: (element) => element.getValue() || "",
		$innerWidth: () => window.innerWidth,
		$innerHeight: () => window.innerHeight,
		$href: () => window.location.href.replace(/\/$/, ""),
		$origin: () => window.location.origin,
		$protocol: () => window.location.protocol,
		$hostname: () => window.location.hostname,
		$host: () => window.location.host,
		$port: () => window.location.port,
		$pathname: () => window.location.pathname.replace(/\/$/, ""),
		$hash: () => window.location.hash,
		$subdomain: () => getSubdomain() || "",
		$object_id: () => ObjectId().toString(),
		"ObjectId()": () => ObjectId().toString(),
		$relativePath: () => {
			let depth = window.location.pathname.split("/").length - 1;
			return depth > 0 ? "../".repeat(depth) : "./";
		},
		$path: () => {
			let path = window.location.pathname;
			if (path.split("/").pop().includes(".")) {
				path = path.replace(/\/[^\/]+$/, "/");
			}
			return path === "/" ? "" : path;
		},
		$param: (element, args) => args,
		$setValue: (element, args) => element.setValue(...args) || ""
	})
);

// Operators that access a specific property of a target element
const propertyOperators = new Set([
	"$scrollWidth",
	"$scrollHeight",
	"$offsetWidth",
	"$offsetHeight",
	"$id",
	"$tagName",
	"$className",
	"$textContent",
	"$innerHTML",
	"$getValue"
]);

// Combine all known operator keys for the main parsing regex
const knownOperatorKeys = [
	...customOperators.keys(),
	...propertyOperators
].sort((a, b) => b.length - a.length);

function escapeRegexKey(key) {
	if (key.startsWith("$")) {
		return "\\" + key; // Escape the leading $
	} else if (key === "ObjectId()") {
		return "ObjectId\\(\\)"; // Escape the parentheses
	}
	return key; // Should not happen with current keys, but fallback
}

const operatorPattern = knownOperatorKeys.map(escapeRegexKey).join("|");

// Regex to find potential operators and their arguments
// $1: Potential operator identifier (e.g., $user_id, $closestDiv)
// $2: Arguments within parentheses (optional)
const regex = new RegExp(`(${operatorPattern})(?:\\s*\\((.*?)\\))?`, "g");

/**
 * Synchronously processes a string, finding and replacing operators recursively.
 * Assumes ALL underlying operations (getValue, queryElements) are synchronous.
 * @param {Element | null} element - Context element.
 * @param {string} value - String containing operators.
 * @param {string[]} [exclude=[]] - Operator prefixes to ignore.
 * @returns {string} - Processed string.
 */
function processOperators(element, value, exclude = [], parent) {
	// Early exit if no operators are possible or value is not a string
	if (typeof value !== "string" || !value.includes("$")) {
		return value;
	}
	let params = [];
	const processedValue = value.replace(
		regex,
		(match, operator, args = "") => {
			// 'match' is the full matched string (e.g., "$closest(.myClass)")
			// 'operator' is the identifier part (e.g., "$closest")
			// 'args' is the content within parentheses (e.g., ".myClass") or "" if no parentheses

			if (operator === "$param" && !args) {
				return match;
			}

			// If a valid operator was identified AND it's not in the exclude list
			if (operator && !exclude.includes(operator)) {
				// Resolve the value for the identified operator and its arguments
				// Pass the *trimmed* arguments to the resolver
				let resolvedValue = resolveOperator(
					element,
					operator,
					args.replace(/^['"]|['"]$/g, "").trim(),
					parent
				);

				if (operator === "$param") {
					params.push(resolvedValue);
					return "";
				}

				return resolvedValue ?? "";
			} else {
				// If no known operator matched, or if it was excluded,
				// return the original matched string (no replacement).
				return match;
			}
		}
	);

	if (params.length) {
		return params;
	}

	return processedValue;
}

/**
/**
 * Synchronously determines and executes the action for processing a single operator token.
 * @param {HTMLElement|null} element - The context element from which to derive values or execute methods.
 * @param {string} operator - The operator to apply, indicating what actions or property/method to evaluate.
 * @param {string|Array} args - Arguments that may be used by the operator, which could be further processed if they contain a nested operator.
 * @param {string} parent - Context in which the function is called, potentially affecting behavior or processing.
 * @returns {string} The final resolved value after applying the operator to the given elements.
 */
function resolveOperator(element, operator, args, parent) {
	// If args contain any operators (indicated by '$'), process them recursively
	if (args && args.includes("$")) {
		// Reprocess args to resolve any nested operators
		args = processOperators(element, args, "", operator);
	}

	// Initialize an array of elements to operate on, starting with the single element reference if provided
	let targetElements = element ? [element] : [];

	// If args are provided as a string, treat it as a selector to find applicable target elements
	if (args && typeof args === "string") {
		targetElements = queryElements({
			element, // Use the context element as the base for querying
			selector: args // Selector from args to find matching elements
		});

		// If no elements are found matching the selector in args, return args unmodified
		if (!targetElements.length) return args;
	}

	// Generate a processed value by applying the operator to each of the target elements
	let value = processValues(targetElements, operator, args, parent);

	// If the result is a string and still contains unresolved operators, process them further
	if (value && typeof value === "string" && value.includes("$")) {
		// Resolve any remaining operators within the value string
		value = processOperators(element, value, parent);
	}

	// Return the final processed value, fully resolved
	return value;
}

/**
 * Synchronously processes and aggregates values from a set of elements based on a specified operator.
 * @param {Array<HTMLElement>} elements - Array of elements to be processed.
 * @param {string} operator - The operator to apply to each element, indicating which property or method to use.
 * @param {string|Array} args - Arguments that may be passed to the method if the operator corresponds to a function.
 * @param {string} parent - Context in which the function is called, possibly influencing behavior (e.g., special handling for "$param").
 * @returns {string} The combined string value obtained by processing elements with the specified operator.
 */
function processValues(elements, operator, args, parent) {
	// Attempt to fetch a custom operator function associated with the operator
	let customOp = customOperators.get(operator);

	// Initialize an empty string to accumulate results from processing each element
	let aggregatedString = "";

	// Iterate over each element in the provided elements array
	for (const el of elements) {
		// If the element is null or undefined, skip to the next iteration
		if (!el) continue;

		// Determine the raw value from the custom operator or by accessing a property/method directly on the element
		let rawValue = customOp || el?.[operator.substring(1)];

		// Check if the rawValue is a function and process it using provided arguments
		if (typeof rawValue === "function") {
			// If arguments are provided as an array
			if (Array.isArray(args)) {
				// If there are arguments, exit by returning an empty string (assumes args should not be used here)
				if (args.length) {
					return "";
				}
				// Invoke the function using the element and spread array arguments
				rawValue = rawValue(el, ...args);
			} else {
				// Otherwise, invoke the function using the element and direct arguments
				rawValue = rawValue(el, args);
			}
		}

		// If the parent context requires parameter resolution
		if (parent === "$param") {
			// Return the first evaluated rawValue that is not null or undefined
			if (rawValue) {
				return rawValue;
			}
		} else {
			// Otherwise, append the stringified rawValue to the aggregated result, defaulting to an empty string if it's nullish
			aggregatedString += String(rawValue ?? "");
		}
	}

	// Return the final aggregated string containing all processed values
	return aggregatedString;
}

/**
 * Extracts the subdomain from the current window's hostname.
 * @returns {string|null} - The subdomain part of the hostname if it exists, or null if there is none.
 */
function getSubdomain() {
	// Retrieve the hostname from the current window's location
	const hostname = window.location.hostname;

	// Split the hostname into parts divided by dots ('.')
	const parts = hostname.split(".");

	// Check if the hostname has more than two parts and ensure the last part isn't a number (a common TLD check)
	// A typical domain structure might look like "sub.domain.com",
	// where "sub" is the subdomain, "domain" is the second-level domain, and "com" is the top-level domain.
	if (parts.length > 2 && isNaN(parseInt(parts[parts.length - 1]))) {
		// Join all parts except the last two (which are assumed to be the domain and TLD) to get the subdomain
		return parts.slice(0, parts.length - 2).join(".");
	}

	// Return null if there's no valid subdomain structure
	return null;
}

export { processOperators };
