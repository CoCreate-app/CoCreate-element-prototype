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
	$href: () => window.location.href,
	$origin: () => window.location.origin,
	$protocol: () => window.location.protocol,
	$host: () => window.location.host,
	$hostname: () => window.location.hostname,
	$port: () => window.location.port,
	$pathname: () => window.location.pathname,
	$hash: () => window.location.hash,
	$subdomain: () => getSubdomain() || ""
};

function urlOperators(value) {
	if (typeof value !== "string") {
		console.error("Value is not a string:", value);
		return value; // Return as-is for non-string input
	}

	console.log("Input value:", value);

	// Regex to match `$subdomain` exactly
	const regex = /\$subdomain/g;

	// Debugging regex match
	if (!regex.test(value)) {
		console.warn("Regex did not match any part of the input value.");
	}

	// Replace `$subdomain` with its resolved value
	const updatedValue = value.replace(regex, (match) => {
		const replacement = operatorsMap[match]?.();
		console.log(`Replacing "${match}" with "${replacement}"`);
		return replacement || "";
	});

	console.log("Updated value:", updatedValue);
	return updatedValue;
}

export default { urlOperators };
