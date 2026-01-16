
import * as views from "quark/view";
import qk, {View,Label,Window} from "quark";
import {createCss} from "quark/css";

export type ViewType = JSX.IntrinsicElementsName;
export type BuildDomArr = ViewType | [ViewType, ...any[]] | BuildDomArr[] | View;

/**
 * @template {keyof ViewTagNameMap} K
 * @overload
 * @param {[K, ...any[]]} arr
 * @param {View} [parent]
 * @param {Record<string, Node>} [refs]
 * @returns {ViewTagNameMap[K]} 
 */
/**
 * @overload
 * @param {any} arr
 * @param {View} [parent]
 * @param [refs]
 * @returns {View | Text | any[]} 
 */
export function buildDom(arr: BuildDomArr, parent?: View, refs?: Dict<View>): any {
	const window = parent ? parent.window : qk.app.activeWindow!;
	if (typeof arr == "string" && arr) {
		// var txt = document.createTextNode(arr);
		var txt = new views.Label(window);
		if (parent)
			parent.append(txt);
		return txt;
	}

	if (!Array.isArray(arr)) {
		if (arr && (arr as View).append && parent)
			parent.append(arr as View);
		return arr;
	}
	if (typeof arr[0] != "string" || !arr[0]) {
		var els = [];
		for (var i = 0; i < arr.length; i++) {
			var ch = buildDom(arr[i] as BuildDomArr, parent, refs);
			ch && els.push(ch);
		}
		return els;
	}
	
	// var el = document.createElement(arr[0]);
	var el = new (views as any)[arr[0][0].toLocaleUpperCase() + arr[0].slice(1)](window, arr[0]) as View;
	var options = arr[1];
	var childIndex = 1;
	if (options && typeof options == "object" && !Array.isArray(options))
		childIndex = 2;
	for (var i = childIndex; i < arr.length; i++)
		buildDom(arr[i] as BuildDomArr, el, refs);
	if (childIndex == 2) {
		Object.keys(options).forEach(function(n) {
			var val = (options as any)[n];
			if (n === "class") {
				el.class = Array.isArray(val) ? val : (val as string).split(" ");
			} else if (typeof val == "function" || n == "value" || n[0] == "$") {
				(el as any)[n] = val;
			} else if (n === "ref") {
				if (refs) refs[val] = el;
			} else if (n === "style") {
				// if (typeof val == "string") 
				// el.style.cssText = val;
				el.style = val;
			} else if (val != null) {
				el.setAttribute(n, val);
			}
		});
	}
	if (parent)
		parent.append(el);
	return el;
};

/**
 * @param {View} el
 * @param {string} name
 * @returns {boolean}
 */
export function hasCssClass(el: View, name: string): boolean {
	return el.hasClass(name);
};

/**
 * Add a CSS class to the list of classes on the given node
 * @param {View} el
 * @param {string} name
*/
export function addCssClass(el: View, name: string) {
	el.addClass(name);
};

/**
 * Remove a CSS class from the list of classes on the given node
 * @param {View} el
 * @param {string} name
 */
export function removeCssClass(el: View, name: string) {
	el.removeClass(name);
};

/**
 * @param {View} el
 * @param {string} name
 * @returns {boolean}
 */
export function toggleCssClass(el: View, name: string): boolean {
	return el.cssclass.toggle(name);
}

/**
 * Add or remove a CSS class from the list of classes on the given node
 * depending on the value of <tt>include</tt>
 * @param {View} node
 * @param {string} className
 * @param {boolean} include
 */
export function setCssClass(node: View, className: string, include?: any) {
	if (include) {
		addCssClass(node, className);
	} else {
		removeCssClass(node, className);
	}
};

// Removes a class from a View and its children recursively
export function removeClassRecursive(element: View, className: string, deep = false) {
	if (!element)
		return;
	var v = element.first;
	while (v) {
		v.removeClass(className);
		if (deep)
			removeClassRecursive(v, className, deep);
		v = v.next;
	}
}

export function getChildren(element: View): View[] {
	var nodes: View[] = [];
	var v = element.first;
	while (v) {
		nodes.push(v);
		v = v.next;
	}
	return nodes;
}

export function replaceChild(node: View, newChildren: View[] | View) {
	if (!Array.isArray(newChildren)) {
		newChildren = [newChildren];
	}
	newChildren.forEach(fragNode => {
		node.after(fragNode);
		node = fragNode;
	});
	node.remove();
}

export function createTextNode(text: string, window: Window): Label {
	var label = new Label(window);
	label.value = text;
	return label;
}

export function importCss(styles: Parameters<typeof createCss>[0], id?: string, apple?: boolean) {
	createCss(styles, apple);
}