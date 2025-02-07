import { ObjectId } from "@cocreate/utils";

const operatorsMap = {
	$organization_id: () => localStorage.getItem("organization_id"),
	$user_id: () => localStorage.getItem("user_id"),
	$clientId: () => localStorage.getItem("clientId"),
	$session_id: () => localStorage.getItem("session_id"),
	$innerWidth: () => window.innerWidth,
	$innerHeight: () => window.innerHeight,
	$value: (element) => element.getValue() || "",
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
	"ObjectId()": () => ObjectId().toString()
};

function processOperators(element, value, exclude = []) {
	if (typeof value !== "string" || !value.includes("$")) {
		return value; // Return as-is for non-string input
	}

	// Dynamically construct a regex from the keys in operatorsMap
	const operatorKeys = Object.keys(operatorsMap)
		.filter((key) => !exclude.includes(key)) // Exclude specified operators
		.map((key) => `\\${key}`)
		.join("|");
	const regex = new RegExp(operatorKeys, "g");

	// Replace matched operators with their resolved values
	return value.replace(regex, (match) => {
		if (operatorsMap[match]) {
			console.log(`Replacing "${match}"`);

			return operatorsMap[match](element) || ""; // Pass `element` explicitly
		}
		// Log a warning with suggestions for valid operators
		console.warn(
			`No match found for "${match}" in operatorsMap. ` +
				`Available operators: ${Object.keys(operatorsMap).join(", ")}`
		);
		return "";
	});
}

function getSubdomain() {
	const hostname = window.location.hostname; // e.g., "api.dev.example.com"
	const parts = hostname.split(".");

	// Handle edge cases for single-word hostnames or IPs
	if (parts.length > 2 && isNaN(parts[parts.length - 1])) {
		return parts.slice(0, parts.length - 2).join("."); // Subdomain
	}

	return null; // No subdomain
}

export default { processOperators };
