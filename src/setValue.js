import CRUD from '@cocreate/crud-client';

let crud
if(CRUD && CRUD.default)
	crud = CRUD.default
else
	crud = CRUD


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
		const {isCrdt} = crud.getAttributes(el);
		if (isCrdt == "true" || el.type === 'file') return;

		if (el.type == 'checkbox') {
			if (value.includes(el.value)) {
				el.checked = true;
			}
			else {
				el.checked = false;
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
	
	else if (el.tagName === 'DIV') {
		if (el.hasAttribute("value")) {
			el.setAttribute("value", value);
		}

		if (el.classList.contains('domEditor') || el.hasAttribute('get-value') || el.hasAttribute('get-value-closest')) {
			if (el.getAttribute('data-domEditor') == "replace") {
				let newElement = document.createElement("div");
				newElement.innerHTML = value;
				let parentNode = el.parentNode;
				if (parentNode) {
					if (newElement.children[0]) {
						parentNode.replaceChild(newElement.children[0], el);
					}
					else {
						parentNode.replaceChild(newElement, el);
					}
				}
			}
			else {
				if (valueType == 'string' || valueType == 'text')
					el.textContent = value;
				else
					el.innerHTML = value;
			}
		}
	}
	
	else if (el.tagName === 'SCRIPT'){
		setScript(el, value);
	}
	else {
		if (el.hasAttribute('contenteditable') && el == document.activeElement) return;
		if (valueType == 'string' || valueType == 'text')
			el.textContent = value;
		else
			el.innerHTML = value;
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
