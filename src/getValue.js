HTMLElement.prototype.getValue = function() {
	let value = getValue(this)
	return value;
};

HTMLInputElement.prototype.getValue = function() {
	let value = getValue(this)
	return value;
};

HTMLHeadingElement.prototype.getValue = function() {
	let value = getValue(this)
	return value;
};


// ToDO: replace esle if with switch case
const getValue = (element) => {
	let value = element.value;
	let prefix = element.getAttribute('value-prefix') || "";
	let suffix = element.getAttribute('value-suffix') || "";

	if (element.type === "checkbox") {
		let el_name = element.getAttribute('name');
		let checkboxs = document.querySelectorAll(`input[type='checkbox'][name='${el_name}']`);
		if (checkboxs.length > 1) {
			value = [];
			checkboxs.forEach(el => {
				if (el.checked) 
					value.push(el.value);
			});
		}
		else {
			if (el.checked) 
				value = el.value
		}
	} else if (element.type === 'radio') {
		let name = element.getAttribute('name');
		value = document.querySelector(`input[name="${name}"]:checked`).value
	}
	else if (element.type === "number") {
		value = Number(value);
	}
	else if (element.type === 'range') {
		value = [Number(element.min), Number(element.value)];
	}
	else if (element.type === "password") {
		value = __encryptPassword(value);
	}
	else if (element.tagName == "SELECT" && element.hasAttribute('multiple')) {
		let options = element.selectedOptions;
		value = [];
		for (let i = 0; i < options.length; i++) {
			value.push(options[i].value);
		}
	}
	else if (element.tagName == 'INPUT' || element.tagName == 'SELECT') {
		value = element.value;
	}
	else if (element.tagName == 'TEXTAREA') {
		if (element.hasAttribute('value'))
			value = element.getAttribute('value');
		else
			value = element.value;
	}
	else if (element.t1agName === 'IFRAME') {
		value = element.srcdoc;
	}
	else if (element.hasAttribute('value')){
		value = element.getAttribute('value');
	}
	else {
		value = element.innerHTML;
	}
	if (prefix || suffix)
		value = prefix + value + suffix;

	return value;
};

function __encryptPassword(str) {
	let encodedString = btoa(str);
	return encodedString;
}

export { getValue };
