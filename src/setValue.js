import { storage } from "./getValue";

HTMLElement.prototype.setValue = function (value, dispatch) {
	setValue(this, value, dispatch);
};

// TODO: check if using a a switch case will provide better performance
const setValue = (el, value, dispatch) => {
	let bubbles = el.hasAttribute("value-bubbles");
	let valueDispatch = el.hasAttribute("value-dispatch");
	if (valueDispatch || valueDispatch === "") {
		if (value === "$false" || value === undefined || value === null)
			return dispatchEvents(el, bubbles, dispatch);
	}

	if (value === null || value === undefined) return;
	if (el.hasAttribute("component") || el.hasAttribute("plugin"))
		return storage.set(el, value);
	else if (typeof value === "object") value = JSON.stringify(value, null, 2);

	if (["time", "datetime", "datetime-local"].includes(el.type)) {
		if (value) {
			const date = new Date(value);
			if (el.type === "time") {
				// Format time as "HH:MM"
				const hours = String(date.getHours()).padStart(2, "0");
				const minutes = String(date.getMinutes()).padStart(2, "0");
				el.value = `${hours}:${minutes}`;
			} else if (el.type === "datetime-local") {
				// Format datetime-local as "YYYY-MM-DDTHH:MM"
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, "0");
				const day = String(date.getDate()).padStart(2, "0");
				const hours = String(date.getHours()).padStart(2, "0");
				const minutes = String(date.getMinutes()).padStart(2, "0");
				el.value = `${year}-${month}-${day}T${hours}:${minutes}`;
			}
		} else {
			el.value = "";
		}
		return dispatchEvents(el, bubbles, dispatch);
	}

	let valueType = el.getAttribute("value-type");
	let prefix = el.getAttribute("value-prefix") || "";
	if (prefix) value = value.toString().replace(prefix, "");

	let suffix = el.getAttribute("value-suffix") || "";
	if (suffix) value = value.toString().replace(suffix, "");

	// TODO: el.options vs rendenring options from src
	if (
		el.tagName == "INPUT" ||
		el.tagName == "TEXTAREA" ||
		el.tagName == "SELECT"
	) {
		// TODO: attribute config undefined when used with onload-value
		let isCrdt = el.getAttribute("crdt");
		if (isCrdt == "true" || el.type === "file") return;

		if (el.type == "checkbox") {
			let inputs = [el];
			let key = el.getAttribute("key");
			if (key)
				inputs = document.querySelectorAll(
					`input[type="${el.type}"][key="${key}"]`
				);

			for (let i = 0; i < inputs.length; i++) {
				let inputValue = inputs[i].getAttribute("value");
				if (inputs[i].value) {
					if (value === true || value === false)
						inputs[i].checked = value;
					else if (value.includes(inputValue) || value === "on") {
						inputs[i].checked = true;
					} else {
						inputs[i].checked = false;
					}
				} else {
					if (
						value === "true" ||
						value === true ||
						value === "checked"
					)
						inputs[i].checked = true;
					else inputs[i].checked = false;
				}
			}
		} else if (el.type === "radio") {
			el.value == value ? (el.checked = true) : (el.checked = false);
		} else if (el.type === "password") {
			el.value = __decryptPassword(value);
		} else if (el.tagName == "SELECT") {
			let options = el.options;
			for (let i = 0; i < options.length; i++) {
				if (value.includes && value.includes(options[i].value)) {
					options[i].selected = "selected";
				} else {
					options[i].selected = "";
				}
			}
		} else {
			if (el.value === value && !valueDispatch) {
				return;
			}

			el.value = value;
		}
		// dispatchEvents(el, bubbles, dispatch);
	} else if (el.tagName === "IMG" || el.tagName === "SOURCE") {
		el.src = value;
	} else if (el.tagName === "IFRAME") {
		el.srcdoc = value;
	} else if (el.tagName === "SCRIPT") {
		setScript(el, value);
	} else if (el.hasAttribute("value")) {
		el.setAttribute("value", value);
	} else {
		if (el.hasAttribute("contenteditable") && el == document.activeElement)
			return;

		if (valueType == "string" || valueType == "text")
			el.textContent = value;
		else {
			let newElement = document.createElement("div");
			newElement.innerHTML = value;
			setState(newElement);

			let CoCreateJS = newElement.querySelector(
				'script[src*="CoCreate.js"], script[src*="CoCreate.min.js"]'
			);
			if (CoCreateJS) CoCreateJS.remove();

			let CoCreateCSS = newElement.querySelector(
				'link[href*="CoCreate.css"], link[href*="CoCreate.min.css"]'
			);
			if (CoCreateCSS) CoCreateCSS.remove();

			let css = newElement.querySelector("link[array], link[object]");
			if (css) css.remove();

			if (valueType == "outerHTML") {
				let parentNode = el.parentNode;
				if (parentNode) {
					if (newElement.children.length > 0) {
						let fragment = document.createDocumentFragment();
						while (newElement.firstChild) {
							fragment.appendChild(newElement.firstChild);
						}
						parentNode.replaceChild(fragment, el);
					} else {
						parentNode.replaceChild(newElement, el);
					}
				}
			} else el.innerHTML = newElement.innerHTML;

			let scripts = el.querySelectorAll("script");
			for (let script of scripts) {
				setScript(script);
			}
		}

		if (el.hasAttribute("value")) {
			el.setAttribute("value", value);
		}
	}

	// if (el.getAttribute("contenteditable")) dispatchEvents(el, bubbles, dispatch);

	if (el.tagName == "HEAD" || el.tagName == "BODY") {
		el.removeAttribute("array");
		el.removeAttribute("object");
		el.removeAttribute("state_id");

		let scripts = el.querySelectorAll("script");
		for (let script of scripts) {
			setScript(script);
		}
	}

	dispatchEvents(el, bubbles, dispatch);
};

function setState(el) {
	if (CoCreate.state) {
		let stateElements = el.querySelectorAll("[state_id]");
		if (stateElements) CoCreate.state.initElements(stateElements);
	}
}

function setScript(script, value) {
	let srcAttribute = script.src;
	if (srcAttribute) {
		let pageOrigin = window.location.origin;
		let srcOrigin;

		try {
			srcOrigin = new URL(srcAttribute, document.baseURI).origin;
		} catch (e) {
			// Handle invalid URLs
			console.error("Invalid URL in src attribute:", srcAttribute);
			return;
		}
		if (pageOrigin !== srcOrigin) return;
	}

	let newScript = document.createElement("script");
	for (let attr of script.attributes) {
		newScript.setAttribute(attr.name, attr.value);
	}
	newScript.innerHTML = script.innerHTML;
	if (value) {
		if (script.hasAttribute("src")) newScript.src = value;
		else newScript.innerHTML = value;
	}
	try {
		script.replaceWith(newScript);
	} catch (error) {
		console.log(error);
	}
}

function __decryptPassword(str) {
	if (!str) return "";
	let decode_str = atob(str);
	return decode_str;
}

function dispatchEvents(el, bubbles = true, skip = true) {
	let inputEvent = new CustomEvent("input", {
		bubbles,
		detail: {
			skip
		}
	});

	Object.defineProperty(inputEvent, "target", {
		writable: false,
		value: el
	});
	el.dispatchEvent(inputEvent);

	let changeEvent = new CustomEvent("change", {
		bubbles,
		detail: {
			skip
		}
	});

	Object.defineProperty(changeEvent, "target", {
		writable: false,
		value: el
	});
	el.dispatchEvent(changeEvent);
}

export { setValue };
