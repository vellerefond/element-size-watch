(function() {
	function getSizeSpec(element, sizeSpec, isWidth) {
		sizeSpec = sizeSpec || '';
		var
			offsetParent = element.parentElement,
			parentClientRect = offsetParent.getClientRects()[0],
			elementClientRect = element.getClientRects()[0]
		;
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

	function parseQuerySpec(querySpec) {
		var _querySpec = {}, querySpecIndex = 0;
		if (querySpec === '*')
			return _querySpec;
		if (!querySpec || /^\s*$/.test(querySpec))
			return null;
		querySpec = querySpec.split(/\s*,\s*/);
		if (!querySpec.length)
			return null;
		var i, specParts;
		for (i = 0; i < querySpec.length; i++) {
			specParts = querySpec[i].split(/\s*:\s*/);
			if (!specParts || specParts.length < 2 || specParts.length > 4)
				continue;
			specParts[0] = specParts[0].trim();
			specParts[1] = specParts[1].trim();
			if (!specParts[0] || !specParts[1])
				continue;
			specParts[0] += ('-' + ++querySpecIndex);
			_querySpec[specParts[0]] = specParts[1];
			if (specParts[2] && !/^\s*$/.test(specParts[2]))
				_querySpec[specParts[0] + '-alias'] = specParts[2];
			if (specParts[3] === 'suppress')
				_querySpec[specParts[0] + '-suppress'] = true;
		}
		return _querySpec;
	}

	/* options: { element, querySpec, callback, useAnimationFrame: true } */
	function onResizeFactory(options) {
		var
			element = options.element,
			querySpec = options.querySpec,
			callback = options.callback,
			useAnimationFrame = options.useAnimationFrame,
			allowQueryClasses = options.allowQueryClasses
		;
		return function() {
			var
				querySpecKeyIndex, querySpecKeys = Object.keys(querySpec), querySpecKey, querySpecValue,
				sizes = getSizeSpec(element), isMin, isMax, isWidth, result, classChange,
				classChangeMap = {}, classChanges, classChangeIndex, classChangeSpec, oppositeClassChange, classesRemoved = [], classesAdded = [];
			for (querySpecKeyIndex = 0; querySpecKeyIndex < querySpecKeys.length; querySpecKeyIndex++) {
				querySpecKey = querySpecKeys[querySpecKeyIndex];
				if (querySpecKey.search('-alias') === Math.max(querySpecKey.length - 6, 0) ||
					querySpecKey.search('-suppress') === Math.max(querySpecKey.length - 9, 0))
					continue;
				querySpecValue = querySpec[querySpecKey];
				isMin = querySpecKey.search('min') === 0;
				isMax = querySpecKey.search('max') === 0;
				isWidth = querySpecKey.search('width') !== -1;
				sizes = getSizeSpec(element, querySpecValue, isWidth);
				if (isMin)
					result = (isWidth ? sizes.width : sizes.height) >= sizes.querySize;
				else if (isMax)
					result = (isWidth ? sizes.width : sizes.height) <= sizes.querySize;
				else
					result = sizes.querySize === (isWidth ? sizes.width : sizes.height);
				classChange =
					(result ? 'added:' : 'removed:')
					+ (querySpec[querySpecKey + '-alias']
						? querySpec[querySpecKey + '-alias']
						: querySpecKey.replace(/-[0-9]+$/, '') + '-' + querySpecValue.replace(/%/, 'pc') + (!allowQueryClasses ? ':suppressed' : ''))
					+ (querySpec[querySpecKey + '-suppress'] ? ':suppressed' : '');
				classChangeMap[classChange] = null;
			}
			classChanges = Object.keys(classChangeMap);
			classChanges.sort();
			for (classChangeIndex = 0; classChangeIndex < classChanges.length; classChangeIndex++) {
				classChangeSpec = classChanges[classChangeIndex].replace(/:suppressed$/, '').split(/:/);
				if (classChangeSpec[0] === 'removed')
					continue;
				oppositeClassChange = 'removed:' + classChangeSpec[1];
				delete classChangeMap[oppositeClassChange];
				delete classChangeMap[oppositeClassChange + ':suppressed'];
			}
			classChanges = Object.keys(classChangeMap);
			classChanges.sort();
			function doClassChanges() {
				for (classChangeIndex = classChanges.length - 1; classChangeIndex >= 0; classChangeIndex--) {
					classChangeSpec = classChanges[classChangeIndex].split(/:/);
					if (classChangeSpec[0] === 'removed') {
						if (classChangeSpec[2] === 'suppressed') {
							if (classesRemoved.indexOf(classChangeSpec[1]) === -1)
								classesRemoved.push(classChangeSpec[1]);
						} else if (element.classList.contains(classChangeSpec[1])) {
							element.classList.remove(classChangeSpec[1]);
							classesRemoved.push(classChangeSpec[1]);
						}
					} else if (classChangeSpec[0] === 'added') {
						if (classChangeSpec[2] === 'suppressed') {
							if (classesAdded.indexOf(classChangeSpec[1]) === -1)
								classesAdded.push(classChangeSpec[1]);
						} else if (!element.classList.contains(classChangeSpec[1])) {
							element.classList.add(classChangeSpec[1]);
							classesAdded.push(classChangeSpec[1]);
						}
					}
				}
				if (typeof callback === 'function' && (querySpecKeys.length === 0 || classesRemoved.length || classesAdded.length))
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
			if (useAnimationFrame && window.requestAnimationFrame)
				window.requestAnimationFrame(doClassChanges);
			else
				doClassChanges();
		};
	};

	/* options: { querySpec, callback, useAnimationFrame: true, allowQueryClasses: true } */
	window.elementSizeWatch = function(element, options) {
		if (!(element instanceof HTMLElement))
			return false;
		options = typeof(options) !== 'undefined' && Object.prototype.toString(options) === '[object Object]' ? options : {}
		options.useAnimationFrame = typeof(options.useAnimationFrame) !== 'undefined' ? options.useAnimationFrame : true;
		options.allowQueryClasses = typeof(options.allowQueryClasses) !== 'undefined' ? options.allowQueryClasses : true;
		options.querySpec = typeof(options.querySpec) === 'string'
			? parseQuerySpec(options.querySpec)
			: parseQuerySpec(element.getAttribute('data-size-watch'));
		if (!options.querySpec)
			return false;
		var iframe = document.createElement('iframe');
		iframe.style.cssText = 'display: inline; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; overflow: visible; z-index: -1000; visibility: visible; opacity: 0; border: none; padding: 0px; margin: 0px; background: transparent; pointer-events: none;';
		element.getClientRects()[0];
		element.appendChild(iframe);
		options.element = element;
		iframe.contentWindow.onresize = onResizeFactory(options);
		return true;
	};
})();
