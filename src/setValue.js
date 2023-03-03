import {getAttributes} from '@cocreate/utils';


HTMLElement.prototype.setValue = function(value) {
	setValue(this, value)
};

HTMLInputElement.prototype.setValue = function(value) {
	setValue(this, value)
};


HTMLHeadingElement.prototype.setValue = function(value) {
	setValue(this, value)
};


const setValue = (el, value) => {
	if (value === null || value === undefined) return;
	let valueType = el.getAttribute('value-type');

	if (el.tagName == 'INPUT' || el.tagName == 'TEXTAREA' || el.tagName == 'SELECT') {
		let {isCrdt} = getAttributes(el)
		if (isCrdt == null || isCrdt == undefined)
			isCrdt = el.getAttribute('crdt')
		if (isCrdt == "true" || el.type === 'file') return;

		if (el.type == 'checkbox') {
			let inputs = [el]
			let name = el.getAttribute('name');
			if (name)
				inputs = document.querySelectorAll(`input[type="${el.type}"][name="${name}"]`);
				
			for (let i = 0; i < inputs.length; i++) {
				if (inputs[i].value) {
					if (value.includes(inputs[i].value))
						inputs[i].checked = true;
					else
						inputs[i].checked = false;
				} else {
					if (value === 'true' || value === true || value === 'checked')
						inputs[i].checked = true;
					else
						inputs[i].checked = false;

				}
			}
		}
		else if (el.type === 'radio') {
			el.value == value ? el.checked = true : el.checked = false;
		}
		else if (el.type === 'password') {
			el.value = __decryptPassword(value);
		}
		else if (el.tagName == "SELECT" && el.hasAttribute('multiple') && Array.isArray(value)) {
			let options = el.options;
			for (let i = 0; i < options.length; i++) {
				if (value.includes(options[i].value)) {
					options[i].selected = "selected";
				} else {
					options[i].selected = "";
				}
			}
		}
		else
			el.value = value;
		dispatchEvents(el)
	}
	else if (el.tagName === 'IMG' || el.tagName === 'SOURCE')
		el.src = value;
	
	else if (el.tagName === 'IFRAME')
		el.srcdoc = value;
	
	else if (el.tagName === 'SCRIPT')
		setScript(el, value);
	
	else {
		if (el.hasAttribute('contenteditable') && el == document.activeElement) return;
		if (el.tagName === 'DIV') {
			if (!el.classList.contains('domEditor') && !el.hasAttribute('get-value') && !el.hasAttribute('get-value-closest'))
				return
		}

		if (valueType == 'string' || valueType == 'text')
			el.textContent = value;
		else {
			let newElement = document.createElement("div");
			newElement.innerHTML = value;
			setPass(newElement)

			let CoCreateJS = newElement.querySelector('script[src*="CoCreate.js"], script[src*="CoCreate.min.js"]')
			if (CoCreateJS)
				CoCreateJS.remove()

			let CoCreateCSS = newElement.querySelector('link[href*="CoCreate.css"], link[href*="CoCreate.min.css"]')
			if (CoCreateCSS)
				CoCreateCSS.remove()

			let css = newElement.querySelector('link[collection], link[document]')
			if (css)
				css.remove()

			if (el.getAttribute('domEditor') == "replace") {
				let parentNode = el.parentNode;
				if (parentNode) {
					if (newElement.children[0]) {
						parentNode.replaceChild(newElement.children[0], el);
					}
					else {
						parentNode.replaceChild(newElement, el);
					}
				}
			} else {
				el.innerHTML = newElement.innerHTML;
			}
		}
	
		if (el.hasAttribute("value")) {
			el.setAttribute("value", value);
		}
	}

	if (el.getAttribute('contenteditable'))
		dispatchEvents(el);
		
	if (el.tagName == 'HEAD' || el.tagName == 'BODY') {
		el.removeAttribute('collection');
		el.removeAttribute('document_id');
		el.removeAttribute('pass_id');

		let scripts = el.querySelectorAll('script');
		for (let script of scripts) {
			setScript(script)
		}
	}
};

function setPass(el) {
	if (CoCreate.pass) {
		let passElements = el.querySelectorAll('[pass_id]');
		if (passElements)
			CoCreate.pass.initElements(passElements)
	}
}

function setScript(script, value) {
	let newScript = document.createElement('script');
	newScript.attributes = script.attributes;
	newScript.innerHTML = script.innerHTML;
	if (value) {
		if (script.hasAttribute("src"))
			newScript.src = value;
		else
			newScript.innerHTML = value;
	}
	script.replaceWith(newScript);
}

function __decryptPassword(str) {
	if (!str) return "";
	let decode_str = atob(str);
	return decode_str;
}

function dispatchEvents(el) {
	let inputEvent = new CustomEvent('input', {
		bubbles: true,
		detail: {
			skip: true
		},
	});
	Object.defineProperty(inputEvent, 'target', {
		writable: false,
		value: el
	});
	el.dispatchEvent(inputEvent);
	
	let changeEvent = new CustomEvent('change', {
		bubbles: true,
		detail: {
			skip: true
		},
	});
	Object.defineProperty(changeEvent, 'target', {
		writable: false,
		value: el
	});
	el.dispatchEvent(changeEvent);
}


export { setValue };
