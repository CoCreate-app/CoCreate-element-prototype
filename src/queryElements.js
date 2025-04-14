import utils from "@cocreate/utils";

/**
 * Custom method to query elements in the context of a specific DOM element.
 *
 * @param {Object} options - Options to customize the query.
 * @returns {NodeListOf<Element>} - A list of elements found based on the query criteria.
 */
function queryElements(options = {}) {
	// Use `this` as the element context and pass additional options to utils.queryElements
	return utils.queryElements({ element: this, ...options });
}

// Attach the method to Element's prototype to allow its use as an instance method
Element.prototype.queryElements = queryElements;

// Export the function for direct use in other parts of your application
export { queryElements };
