/*
 * based on code from:
 *
 * @license RequireJS text 0.25.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

"use strict";
// import * as dom from "./dom";
import * as http from 'quark/http';
import * as buffer from 'quark/buffer';
import uri from 'quark/uri';

export function get(url: string, callback: (responseText: string) => void) {
	// var xhr = new XMLHttpRequest();
	// xhr.open('GET', url, true);
	// xhr.onreadystatechange = function () {
	// 	//Do not explicitly handle errors, those should be
	// 	//visible via console output in the browser.
	// 	if (xhr.readyState === 4) {
	// 		callback(xhr.responseText);
	// 	}
	// };
	// xhr.send(null);
	http.get(url).then(response => {
		callback(buffer.toString(response.data));
	});
};

export function loadScript(path: string, callback: () => void) {
	// var head = dom.getDocumentHead();
	// /**@type {HTMLScriptElement & {onload?: Function, onreadystatechange?: Function, readyState?: string}}*/
	// var s = document.createElement('script');

	// s.src = path;
	// head.appendChild(s);

	// s.onload = s.onreadystatechange = function(_, isAbort) {
	// 	if (isAbort || !s.readyState || s.readyState == "loaded" || s.readyState == "complete") {
	// 		s = s.onload = s.onreadystatechange = null;
	// 		if (!isAbort)
	// 			callback();
	// 	}
	// };
};

/*
 * Converts the passed URL to a fully qualified URL.
 */
export function qualifyURL(url: string) {
	return uri.resolve(url);
};
