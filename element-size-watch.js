window.addEventListener('load', function sizeWatch() {
	window.removeEventListener('load', sizeWatch);

	function getSizes(element, sizeSpec, isWidth) {
		var
			offsetParent = element.parentElement,
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
		var
			spec = {},
			specAttr = element.getAttribute('data-size-watch'),
			specAttrIndex = 0;
		if (!specAttr || /^\s*$/.test(specAttr))
			return null;
		specAttr = specAttr.split(/\s*,\s*/);
		if (!specAttr.length)
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
			specParts[0] += ('-' + ++specAttrIndex);
			spec[specParts[0]] = specParts[1];
			if (specParts[2] && !/^\s*$/.test(specParts[2]))
				spec[specParts[0] + '-alias'] = specParts[2];
		}
		return spec;
	}

	/* options: { element, querySpec, callback, useAnimationFrame: true } */
	function onResizeFactory(options) {
		return function(element, querySpec, callback) {
			var
				querySpecKeyIndex, querySpecKeys = Object.keys(querySpec), querySpecKey, querySpecValue,
				sizes, isMin, isMax, isWidth, result, classChange,
				classChangeMap = {}, classChanges, classChangeIndex, classChangeSpec, oppositeClassChange, classesRemoved = [], classesAdded = [];
			for (querySpecKeyIndex = 0; querySpecKeyIndex < querySpecKeys.length; querySpecKeyIndex++) {
				querySpecKey = querySpecKeys[querySpecKeyIndex];
				if (querySpecKey.search('-alias') === Math.max(querySpecKey.length - 6, 0))
					continue;
				querySpecValue = querySpec[querySpecKey];
				isMin = querySpecKey.search('min') === 0;
				isMax = querySpecKey.search('max') === 0;
				isWidth = querySpecKey.search('width') !== -1;
				sizes = getSizes(element, querySpecValue, isWidth);
				if (isMin)
					result = (isWidth ? sizes.width : sizes.height) >= sizes.querySize;
				else if (isMax)
					result = (isWidth ? sizes.width : sizes.height) <= sizes.querySize;
				else
					result = sizes.querySize === (isWidth ? sizes.width : sizes.height);
				classChange = (result ? 'added:' : 'removed:') + (querySpec[querySpecKey + '-alias']
					? querySpec[querySpecKey + '-alias']
					: querySpecKey.replace(/-[0-9]+$/, '') + '-' + querySpecValue.replace(/%/, 'pc'));
				classChangeMap[classChange] = null;
			}
			classChanges = Object.keys(classChangeMap);
			classChanges.sort();
			for (classChangeIndex = 0; classChangeIndex < classChanges.length; classChangeIndex++) {
				classChangeSpec = classChanges[classChangeIndex].split(/:/);
				if (classChangeSpec[0] === 'removed')
					continue;
				oppositeClassChange = 'removed:' + classChangeSpec[1];
				delete classChangeMap[oppositeClassChange];
				delete classChangeMap[oppositeClassChange + '-alias'];
			}
			classChanges = Object.keys(classChangeMap);
			classChanges.sort();
			function doClassChanges() {
				for (classChangeIndex = classChanges.length - 1; classChangeIndex >= 0; classChangeIndex--) {
					classChangeSpec = classChanges[classChangeIndex].split(/:/);
					if (classChangeSpec[0] === 'removed') {
						if (element.classList.contains(classChangeSpec[1])) {
							element.classList.remove(classChangeSpec[1]);
							classesRemoved.push(classChangeSpec[1]);
						}
					} else if (classChangeSpec[0] === 'added') {
						if (!element.classList.contains(classChangeSpec[1])) {
							element.classList.add(classChangeSpec[1]);
							classesAdded.push(classChangeSpec[1]);
						}
					}
				}
				if (typeof callback === 'function' && (classesRemoved.length || classesAdded.length))
					callback({
						element: element,
						elementSize: {
							width: sizes.width,
							height: sizes.height
						},
						classesRemoved: classesRemoved,
						classesAdded: classesAdded
					});
			}
			if (options.useAnimationFrame && window.requestAnimationFrame)
				window.requestAnimationFrame(doClassChanges);
			else
				doClassChanges();
		}.bind(null, options.element, options.querySpec, options.callback);
	};

	/* options: { querySpec, callback, useAnimationFrame: true } */
	HTMLElement.prototype.sizeWatch = function(options) {
		options = typeof(options) !== 'undefined' && Object.prototype.toString(options) === '[object Object]' ? options : {}
		options.useAnimationFrame = typeof(options.useAnimationFrame) !== 'undefined' ? options.useAnimationFrame : true;
		if (!this.classList || !this.getAttribute)
			return this;
		if (typeof(options.callback) === 'string') {
			options.querySpec = callback;
			options.callback = undefined;
		}
		if (typeof(options.querySpec) === 'string')
			this.setAttribute('data-size-watch', querySpec);
		options.querySpec = parseQuerySpec(this);
		if (!options.querySpec)
			return this;
		var iframe = document.createElement('iframe');
		iframe.src = 'about:blank';
		iframe.style.cssText = 'display: inline; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; overflow: visible; z-index: -1000; visibility: visible; opacity: 0; border: none; padding: 0px; margin: 0px; background: transparent; pointer-events: none;';
		this.appendChild(iframe);
		options.element = this;
		iframe.contentWindow.onresize = onResizeFactory(options);
		return this;
	};
});
