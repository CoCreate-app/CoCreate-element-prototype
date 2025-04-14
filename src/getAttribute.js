import { processOperators } from "./operators";

// Store a reference to the original getAttribute function
const originalGetAttribute = Element.prototype.getAttribute;

// Map to store attribute details
const attributes = new Map();

// Add an event listener for storage events to update attributes
window.addEventListener("storage", updateAttributes);
// Custom event to update attributes
window.addEventListener("updateAttributes", function (e) {
	updateAttributes(e.detail);
});

/**
 * Function to update attributes based on specific storage keys
 * @param {Object} e - The event object containing key and newValue
 */
function updateAttributes(e) {
	const keys = ["organization_id", "user_id", "clientId", "session_id"];
	if (keys.includes(e.key)) {
		let attr = attributes.get(e.key) || [];
		for (let attribute of attr) {
			attribute.element.setAttribute(attribute.name, e.newValue);
		}
	}
}

/**
 * Custom getAttribute function that processes the attribute value
 * @param {Element} element - The element from which to get the attribute
 * @param {string} name - The attribute name
 * @returns {string} - The processed attribute value
 */
function getAttribute(element, name) {
	if (!(element instanceof Element)) {
		throw new Error("First argument must be an Element");
	}
	let value = originalGetAttribute.call(element, name);
	return processOperators(element, value);
}

// Override the getAttribute method on Element prototype
Element.prototype.getAttribute = function (name) {
	return getAttribute(this, name); // Use the custom getAttribute function
};

// Export the custom getAttribute function
export { getAttribute };
