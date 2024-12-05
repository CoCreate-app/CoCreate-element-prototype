import utility from "./utility";

// Store a reference to the original getAttribute function
const originalGetAttribute = Element.prototype.getAttribute;
const attributes = new Map();

window.addEventListener("storage", updateAttributes);
window.addEventListener("updateAttributes", function (e) {
	updateAttributes(e.detail);
});

function updateAttributes(e) {
	const keys = ["organization_id", "user_id", "clientId", "session_id"];
	if (keys.includes(e.key)) {
		let attr = attributes.get(e.key) || [];
		for (let attribute of attr) {
			attribute.element.setAttribute(attribute.name, e.newValue);
		}
	}
}

// Override the getAttribute function
Element.prototype.getAttribute = function (name) {
	let value = originalGetAttribute.call(this, name);

	const localKeys = {
		$organization_id: "organization_id",
		$user_id: "user_id",
		$clientId: "clientId",
		$session_id: "session_id"
	};

	if (localKeys.hasOwnProperty(value)) {
		let newValue = localStorage.getItem(localKeys[value]);

		if (!attributes.has(localKeys[value])) {
			attributes.set(localKeys[value], []);
		}

		attributes.get(localKeys[value]).push({
			element: this,
			name,
			value: newValue
		});
		value = newValue;
	} else if (value === "$innerWidth") {
		value = window.innerWidth;
	} else if (value === "$innerHeight") {
		value = window.innerHeight;
	} else if (typeof value === "string" && value.includes("$")) {
		value = utility.urlOperators(value);
	}

	return value;
};
