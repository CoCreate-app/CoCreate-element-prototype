import { ObjectId } from "@cocreate/utils";

function getSubdomain() {
	const hostname = window.location.hostname; // e.g., "api.dev.example.com"
	const parts = hostname.split(".");

	// Handle edge cases for single-word hostnames or IPs
	if (parts.length > 2 && isNaN(parts[parts.length - 1])) {
		return parts.slice(0, parts.length - 2).join("."); // Subdomain
	}

	return null; // No subdomain
}

const operatorsMap = {
	$href: function () {
		return window.location.href;
	},
	$origin: function () {
		return window.location.origin;
	},
	$protocol: function () {
		return window.location.protocol;
	},
	$host: function () {
		return window.location.host;
	},
	$hostname: function () {
		return window.location.hostname;
	},
	$port: function () {
		return window.location.port;
	},
	$pathname: function () {
		return window.location.pathname;
	},
	$hash: function () {
		return window.location.hash;
	},
	$subdomain: function () {
		return getSubdomain() || "";
	},
	$object_id: function () {
		return ObjectId().toString();
	}
};

function urlOperators(value) {
	if (typeof value !== "string") {
		console.error("Value is not a string:", value);
		return value; // Return as-is for non-string input
	}

	// Dynamically construct a regex from the keys in operatorsMap
	const operatorKeys = Object.keys(operatorsMap)
		.map((key) => `\\${key}`)
		.join("|");
	const regex = new RegExp(operatorKeys, "g");

	// Debugging regex match
	// if (!regex.test(value)) {
	// 	console.warn("Regex did not match any part of the input value.");
	// }

	// Replace matched operators with their resolved values
	const updatedValue = value.replace(regex, function (match) {
		if (operatorsMap[match]) {
			const replacement = operatorsMap[match]();
			console.log(`Replacing "${match}" with "${replacement}"`);
			return replacement || "";
		} else {
			console.warn(`No match found for "${match}" in operatorsMap.`);
			return ""; // Default replacement if operator not found
		}
	});

	return updatedValue;
}

export default { urlOperators };
