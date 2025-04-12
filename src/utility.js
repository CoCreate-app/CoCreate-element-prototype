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
 * Synchronously determines and executes the action for a single operator token.
 * @returns {string} The final string value for the token.
 */
function resolveOperator(element, operator, args, parent) {
	if (args && args.includes("$")) {
		args = processOperators(element, args, "", operator);
	}

	let targetElements = element ? [element] : [];
	if (args && typeof args === "string") {
		targetElements = queryElements({
			element,
			selector: args
		});
		if (!targetElements.length) return args;
	}

	let value = processValues(targetElements, operator, args, parent);
	if (value && typeof value === "string" && value.includes("$")) {
		value = processOperators(element, value, parent);
	}

	return value;
}

/**
 * Synchronously aggregates values.
 * @returns {string} The aggregated string value.
 */
function processValues(elements, operator, args, parent) {
	let customOp = customOperators.get(operator);
	let aggregatedString = "";
	for (const el of elements) {
		if (!el) continue;
		let rawValue = customOp || el?.[operator.substring(1)];
		if (typeof rawValue === "function") {
			if (Array.isArray(args)) {
				if (args.length) {
					return "";
				}
				rawValue = rawValue(el, ...args);
			} else {
				rawValue = rawValue(el, args);
			}
		}

		if (parent === "$param") {
			if (rawValue) {
				return rawValue;
			}
		} else {
			aggregatedString += String(rawValue ?? "");
		}
	}

	return aggregatedString;
}

function getSubdomain() {
	const hostname = window.location.hostname;
	const parts = hostname.split(".");
	if (parts.length > 2 && isNaN(parseInt(parts[parts.length - 1]))) {
		return parts.slice(0, parts.length - 2).join(".");
	}
	return null;
}

export { processOperators };
