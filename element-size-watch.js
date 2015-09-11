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

	function substituteMinMax(querySpec) {
		var all, rule, value, klass, extra;
		querySpec.replace(/(min-max-[^,:]+):([^,:]+):([^,:]+)(?::([^,:]+))?/, function(a, r, v, k, e) {
			all = a; rule = r; value = v; klass = k; extra = e;
		});
		if (!all)
			return undefined;
		var ruleType;
		rule.replace(/-(width|height)$/g, function(r, rt) { ruleType = rt; return ''; });
		ruleType = ruleType || '';
		if (!ruleType)
			return all;
		value = value.split(/-/);
		if (value.length !== 2)
			return all;
		var valueType;
		value = [
			parseFloat(value[0].replace(/[^0-9]+/g, '')),
			parseFloat(value[1].replace(/[^0-9]+/g, function(vt) { valueType = vt; return ''; }))
		];
		if (isNaN(value[0]) || isNaN(value[1]))
			return all;
		valueType = valueType || '';
		value[0] += valueType;
		value[1] = (value[1] - parseInt(value[1]) === 0 ? parseInt(value[1]) + 1 : value[1] + 0.1) + valueType;
		querySpec = querySpec.replace(new RegExp(all), [
				[ 'min-width', value[0], klass ].join(':') + (extra ? ':' + extra : ''),
				[ 'min-width', value[1], klass, 'clear' ].join(':')
		].join(','));
		var nextQuerySpec = substituteMinMax(querySpec);
		if (!nextQuerySpec)
			return querySpec;
		return substituteMinMax(querySpec);
	}

	function substituteSyntheticSubQueries(querySpec) {
		return substituteMinMax(querySpec);
	}

	function parseQuerySpec(querySpec) {
		var _querySpec = {}, querySpecIndex = 0;
		if (querySpec === '*')
			return _querySpec;
		if (!querySpec || /^\s*$/.test(querySpec))
			return null;
		querySpec = substituteSyntheticSubQueries(querySpec);
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
			if (/[0-9]$/.test(specParts[1]))
				specParts[1] += 'px';
			specParts[0] += ('-' + ++querySpecIndex);
			_querySpec[specParts[0]] = specParts[1];
			if (specParts[2] && !/^\s*$/.test(specParts[2]))
				_querySpec[specParts[0] + '-alias'] = specParts[2];
			if (specParts[3] === 'suppress')
				_querySpec[specParts[0] + '-suppress'] = true;
			else if (specParts[3] === 'clear')
				_querySpec[specParts[0] + '-clear'] = true;
		}
		return _querySpec;
	}

	function onResizeHandler(element, querySpec, callback, useAnimationFrame, allowQueryClasses) {
		var
			querySpecKeyIndex, querySpecKeys = Object.keys(querySpec), querySpecKey, querySpecValue,
			sizes = getSizeSpec(element), isMin, isMax, isWidth, result, classChange,
			classChangeMap = {}, classChanges, classChangeIndex, classChangeSpec, oppositeClassChange,
			classesRemoved = [], classesAdded = [], conflictingClassChanges = [];
		for (querySpecKeyIndex = 0; querySpecKeyIndex < querySpecKeys.length; querySpecKeyIndex++) {
			querySpecKey = querySpecKeys[querySpecKeyIndex];
			if (querySpecKey.search('-alias') === Math.max(querySpecKey.length - 6, 0) ||
					querySpecKey.search('-suppress') === Math.max(querySpecKey.length - 9, 0) ||
					querySpecKey.search('-clear') === Math.max(querySpecKey.length - 6, 0))
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
				(result ? (querySpec[querySpecKey + '-clear'] !== true ? 'added:' : 'cleared:') : 'removed:')
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
		classChanges.sort().sort(function(a, b) {
			if (a.split(/:/)[0] === 'cleared')
				return -1;
			if (b.split(/:/)[0] === 'cleared')
				return 1;
			return 0;
		});
		function doClassChanges() {
			for (classChangeIndex = classChanges.length - 1; classChangeIndex >= 0; classChangeIndex--) {
				classChangeSpec = classChanges[classChangeIndex].split(/:/);
				if (classChangeSpec[0] === 'removed' || classChangeSpec[0] === 'cleared') {
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
			for (classChangeIndex = 0; classChangeIndex < classesRemoved.length; classChangeIndex++)
				if (classesAdded.indexOf(classesRemoved[classChangeIndex]) !== -1 && !element.classList.contains(classesRemoved[classChangeIndex]))
					conflictingClassChanges.push(classesRemoved[classChangeIndex])
			classesAdded = classesAdded.filter(function(klass) { return conflictingClassChanges.indexOf(klass) === -1; })
			classesRemoved = classesRemoved.filter(function(klass) { return conflictingClassChanges.indexOf(klass) === -1; })
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
	}

	/* options: { querySpec, callback, useAnimationFrame: true, allowQueryClasses: true, useDeferredEventBinding: false } */
	window.elementSizeWatch = function(element, options) {
		if (!(element instanceof HTMLElement))
			return false;
		options = typeof(options) !== 'undefined' && Object.prototype.toString(options) === '[object Object]' ? options : {}
		options.querySpec = typeof(options.querySpec) === 'string' ? parseQuerySpec(options.querySpec) : parseQuerySpec(element.getAttribute('data-size-watch'));
		options.useAnimationFrame = typeof(options.useAnimationFrame) !== 'undefined' ? options.useAnimationFrame : true;
		options.allowQueryClasses = typeof(options.allowQueryClasses) !== 'undefined' ? options.allowQueryClasses : true;
		options.useDeferredEventBinding = typeof(options.useDeferredEventBinding) !== 'undefined' ? options.useDeferredEventBinding : false;
		if (!options.querySpec)
			return false;
		options.element = element;
		var
			iframe,
			_onResizeHandler = function() {
				onResizeHandler(options.element, options.querySpec, options.callback, options.useAnimationFrame, options.allowQueryClasses)
			}
		;
		element.elementSizeWatchInspect = _onResizeHandler;
		if (!options.useDeferredEventBinding) {
			iframe = document.createElement('iframe');
			iframe.style.cssText = 'display: inline; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; overflow: visible; z-index: -1000; visibility: visible; opacity: 0; border: none; padding: 0px; margin: 0px; background: transparent; pointer-events: none;';
			element.getClientRects()[0];
			element.appendChild(iframe);
			iframe.contentWindow.onresize = _onResizeHandler;
			_onResizeHandler();
		} else {
			element.elementSizeWatchOnResizeEventBind = function() {
				if (!iframe) {
					iframe = document.createElement('iframe');
					iframe.style.cssText = 'display: inline; position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; overflow: visible; z-index: -1000; visibility: visible; opacity: 0; border: none; padding: 0px; margin: 0px; background: transparent; pointer-events: none;';
					element.getClientRects()[0];
					element.appendChild(iframe);
				}
				iframe.contentWindow.onresize = _onResizeHandler;
				_onResizeHandler();
			};
		}
		return true;
	};
})();
