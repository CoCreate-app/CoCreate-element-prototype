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
	return utility.processOperators(this, value);
};
