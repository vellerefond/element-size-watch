window.addEventListener('load', function sizeWatch() {
	window.removeEventListener('load', sizeWatch);

	function getSizes(element, sizeSpec, isWidth) {
		var offsetParent = element.parentElement,
			parentClientRect = offsetParent.getClientRects()[0],
			elementClientRect = element.getClientRects()[0];
		if (sizeSpec.search('%') === sizeSpec.length - 1) {
			sizeSpec = parseFloat(sizeSpec.replace(/%$/, ''));
			sizeSpec = (sizeSpec / 100) * (isWidth ? parentClientRect.width : parentClientRect.height);
		} else {
			sizeSpec = parseInt(sizeSpec.replace(/[^0-9.-]/g, ''));
		}
		return {
			width: elementClientRect.width,
			height: elementClientRect.height,
			querySize: sizeSpec
		};
	}

	function parseQuerySpec(element) {
		var spec = {},
			specAttr = element.getAttribute('data-size-watch');
		if (!specAttr || /^\s*$/.test(specAttr))
			return null;
		specAttr = specAttr.split(/\s*,\s*/);
		if (!specAttr)
			return null;
		var i, specParts;
		for (i = 0; i < specAttr.length; i++) {
			specParts = specAttr[i].split(/\s*:\s*/);
			if (!specParts || !(specParts.length === 2 || specParts.length === 3))
				continue;
			specParts[0] = specParts[0].trim();
			specParts[1] = specParts[1].trim();
			if (!specParts[0] || !specParts[1])
				continue;
			spec[specParts[0]] = specParts[1];
			if (specParts[2] && !/^\s*$/.test(specParts[2]))
				spec[specParts[0] + '-alias'] = specParts[2];
		}
		return spec;
	}

	function onResizeFactory(element, querySpec, callback) {
		return function(element, querySpec) {
			var querySpecKeyIndex, querySpecKeys = Object.keys(querySpec),
				querySpecKey, querySpecValue, sizes, isMin, isMax, isWidth, result, klass, classesAdded = [], classesRemoved = [];
			for (querySpecKeyIndex = 0; querySpecKeyIndex < querySpecKeys.length; querySpecKeyIndex++) {
				querySpecKey = querySpecKeys[querySpecKeyIndex];
				if (querySpecKey.search('-alias') === Math.max(querySpecKey.length - 6, 0))
					continue;
				querySpecValue = querySpec[querySpecKey];
				isMin = querySpecKey.search('min') === 0;
				isMax = querySpecKey.search('max') === 0;
				isWidth = querySpecKey.search('width') === querySpecKey.length - 5;
				sizes = getSizes(element, querySpecValue, isWidth);
				if (isMin)
					result = (isWidth ? sizes.width : sizes.height) >= sizes.querySize;
				else if (isMax)
					result = (isWidth ? sizes.width : sizes.height) <= sizes.querySize;
				else
					result = sizes.querySize === (isWidth ? sizes.width : sizes.height);
				klass = querySpec[querySpecKey + '-alias'] ? querySpec[querySpecKey + '-alias'] : querySpecKey + '-' + querySpecValue.replace(/%/, 'pc');
				if (result) {
					if (!element.classList.contains(klass)) {
						classesAdded.push(klass);
						element.classList.add(klass);
					}
				} else {
					if (element.classList.contains(klass)) {
						classesRemoved.push(klass);
						element.classList.remove(klass);
					}
				}
			}
			if (typeof callback === 'function' && (classesAdded.length || classesRemoved.length))
					callback(element, classesAdded, classesRemoved);
		}.bind(null, element, querySpec);
	};

	HTMLElement.prototype.sizeWatch = function(callback) {
		if (!this.classList || !this.getAttribute)
			return this;
		var querySpec = parseQuerySpec(this);
		if (!querySpec)
			return this;
		var iframe = document.createElement('iframe');
		iframe.src = 'about:blank';
		iframe.style.cssText = 'display: inline; position: relative; top: 0px; left: 0px; width: 100%; height: 100%; overflow: visible; z-index: -1000; visibility: visible; opacity: 0; border: none; padding: 0px; margin: 0px; background: transparent; pointer-events: none;';
		this.appendChild(iframe);
		iframe.contentWindow.onresize = onResizeFactory(this, querySpec, callback);
		return this;
	};
});
