
import {View} from "quark";
import { KeyEvent, UIEvent,GestureEvent } from "quark/event";
import { KeyboardCode } from "quark/keyboard";

declare global {
	function define(fun: (require: any, exports: any, module: any) => void): void;
}

globalThis.define = function(fun) {
	fun(require, module.exports, module);
}

declare module "quark/view" {
	// Extend Quark View to support attributes
	export interface View {
		getAttributes(): Dict;
		setAttribute(key: string, val: any): void;
		getAttribute(key: string): any;
		removeAttribute(key: string): void;
		querySelectorAllForClass(selector: string): View[];
		querySelectorForClass(selector: string): View | null;
		querySelectorAllForAttribute(attr: string, value: string): View[];
		querySelectorForAttribute(attr: string, value: string): View | null;
	}
}

declare module "quark/event" {
	export interface UIEvent {
		stopPropagation(): void; // DOM Event.stopPropagation
		preventDefault(): void; // DOM Event.preventDefault
	}
	export interface GestureEvent extends UIEvent {} // for completeness
	export interface KeyEvent {
		readonly keyCode: number; // DOM KeyboardEvent.keyCode
		readonly key: string; // DOM KeyboardEvent.key
		readonly domCode: string; // DOM KeyboardEvent.code
	}
}

View.prototype.getAttributes = function(this: View) {
	// return this.data || (this.data = {});
	return this as any as Dict;
};

View.prototype.setAttribute = function(this: View, key: string, val: any) {
	this.getAttributes()[key] = val;
};

View.prototype.getAttribute = function(this: View, key: string) {
	// return this.data ? this.data[key]: undefined;
	return (this as any)[key];
};

View.prototype.removeAttribute = function(this: View, key: string) {
	// if (this.data) delete this.data[key];
	delete (this as any)[key];
};

View.prototype.querySelectorAllForClass = function(this: View, selector: string) {
	return querySelectorAllForClass(this, selector);
};

View.prototype.querySelectorForClass = function(this: View, selector: string) {
	return querySelectorForClass(this, selector);
};

View.prototype.querySelectorAllForAttribute = function(this: View, attr: string, value: string) {
	return querySelectorAllForAttribute(this, attr, value);
};

View.prototype.querySelectorForAttribute = function(this: View, attr: string, value: string) {
	return querySelectorForAttribute(this, attr, value);
};

const KeyCodeToDomCode: Partial<Record<number, string>> = {
	[KeyboardCode.ENTER]: 'Enter',
	[KeyboardCode.TAB]: 'Tab',
	[KeyboardCode.BACK_SPACE]: 'Backspace',
	[KeyboardCode.ESC]: 'Escape',
	[KeyboardCode.SPACE]: 'Space',

	[KeyboardCode.LEFT]: 'ArrowLeft',
	[KeyboardCode.RIGHT]: 'ArrowRight',
	[KeyboardCode.UP]: 'ArrowUp',
	[KeyboardCode.DOWN]: 'ArrowDown',

	[KeyboardCode.MOVE_HOME]: 'Home',
	[KeyboardCode.MOVE_END]: 'End',
	[KeyboardCode.PAGE_UP]: 'PageUp',
	[KeyboardCode.PAGE_DOWN]: 'PageDown',

	[KeyboardCode.DELETE]: 'Delete',
	[KeyboardCode.INSERT]: 'Insert',
};

UIEvent.prototype.stopPropagation = function(this: UIEvent) {
	this.cancelBubble();
}

UIEvent.prototype.preventDefault = function(this: UIEvent) {
	this.cancelDefault();
}

GestureEvent.prototype.stopPropagation = function(this: GestureEvent) {
	this.cancelBubble();
}

GestureEvent.prototype.preventDefault = function(this: GestureEvent) {
	this.cancelDefault();
}

Object.defineProperties(KeyEvent.prototype, {
	/**
	 * DOM compatibility: deprecated but heavily used by ACE
	 */
	keyCode: {
		get: function (this: KeyEvent) {
			return this.keycode;
		}
	},

	/**
	 * DOM KeyboardEvent.key
	 */
	key: {
		get: function (this: KeyEvent) {
			// 可打印字符
			if (this.keypress > 0) {
				return String.fromCharCode(this.keypress);
			}

			// 控制键兜底
			switch (this.keycode) {
				case KeyboardCode.ENTER: return 'Enter';
				case KeyboardCode.TAB: return 'Tab';
				case KeyboardCode.BACK_SPACE: return 'Backspace';
				case KeyboardCode.ESC: return 'Escape';
				case KeyboardCode.SPACE: return ' ';
				case KeyboardCode.LEFT: return 'ArrowLeft';
				case KeyboardCode.RIGHT: return 'ArrowRight';
				case KeyboardCode.UP: return 'ArrowUp';
				case KeyboardCode.DOWN: return 'ArrowDown';
			}

			return '';
		}
	},

	/**
	 * DOM KeyboardEvent.code
	 */
	domCode: {
		get: function (this: KeyEvent) {
			const kc = this.code;

			// A-Z → KeyA
			if (kc >= KeyboardCode.A && kc <= KeyboardCode.Z) {
				return 'Key' + String.fromCharCode(kc);
			}

			// 0-9 → Digit0
			if (kc >= KeyboardCode.NUM_0 && kc <= KeyboardCode.NUM_9) {
				return 'Digit' + (kc - KeyboardCode.NUM_0);
			}

			// F1-F24
			if (kc >= KeyboardCode.F1 && kc <= KeyboardCode.F24) {
				return 'F' + (kc - KeyboardCode.F1 + 1);
			}

			return KeyCodeToDomCode[kc] || KeyboardCode[kc] || '';
		}
	}
});

function querySelectorForClassImpl(element: View, selector: string, results: View[], limit: number) {
	var v = element.first;
	while (v) {
		if (v.hasClass(selector)) {
			results.push(v);
			if (results.length >= limit)
				return;
		}
		querySelectorForClassImpl(v, selector, results, limit);
		v = v.next;
	}
}

function querySelectorForAttributeImpl(element: View, attr: string, value: string, results: View[], limit: number) {
	var v = element.first;
	while (v) {
		if (v.getAttribute(attr) == value) {
			results.push(v);
			if (results.length >= limit)
				return;
		}
		querySelectorForAttributeImpl(v, attr, value, results, limit);
		v = v.next;
	}
}

export function querySelectorAllForClass(element: View, selector: string) {
	var results: View[] = [];
	querySelectorForClassImpl(element, selector, results, 0xffffffff);
	return results;
}

export function querySelectorForClass(element: View, selector: string): View | null {
	var results: View[] = [];
	querySelectorForClassImpl(element, selector, results, 1);
	return results.length > 0 ? results[0] : null;
}

export function querySelectorAllForAttribute(element: View, attr: string, value: string) {
	var results: View[] = [];
	querySelectorForAttributeImpl(element, attr, value, results, 0xffffffff);
	return results;
}

export function querySelectorForAttribute(element: View, attr: string, value: string): View | null {
	var results: View[] = [];
	querySelectorForAttributeImpl(element, attr, value, results, 1);
	return results.length > 0 ? results[0] : null;
}
