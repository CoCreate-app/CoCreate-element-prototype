import utils from "@cocreate/utils";

Element.prototype.queryElements = function (options = {}) {
	return utils.queryElements({ element: this, ...options });
};
