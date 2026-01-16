
import {View} from "quark";
import { KeyEvent, UIEvent,GestureEvent } from "quark/event";
import { KeyboardKeyCode } from "quark/keyboard";

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
	return this.data ? this.data[key]: undefined;
};

View.prototype.removeAttribute = function(this: View, key: string) {
	if (this.data) delete this.data[key];
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
	[KeyboardKeyCode.ENTER]: 'Enter',
	[KeyboardKeyCode.TAB]: 'Tab',
	[KeyboardKeyCode.BACK_SPACE]: 'Backspace',
	[KeyboardKeyCode.ESC]: 'Escape',
	[KeyboardKeyCode.SPACE]: 'Space',

	[KeyboardKeyCode.LEFT]: 'ArrowLeft',
	[KeyboardKeyCode.RIGHT]: 'ArrowRight',
	[KeyboardKeyCode.UP]: 'ArrowUp',
	[KeyboardKeyCode.DOWN]: 'ArrowDown',

	[KeyboardKeyCode.MOVE_HOME]: 'Home',
	[KeyboardKeyCode.MOVE_END]: 'End',
	[KeyboardKeyCode.PAGE_UP]: 'PageUp',
	[KeyboardKeyCode.PAGE_DOWN]: 'PageDown',

	[KeyboardKeyCode.DELETE]: 'Delete',
	[KeyboardKeyCode.INSERT]: 'Insert',
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
				case KeyboardKeyCode.ENTER: return 'Enter';
				case KeyboardKeyCode.TAB: return 'Tab';
				case KeyboardKeyCode.BACK_SPACE: return 'Backspace';
				case KeyboardKeyCode.ESC: return 'Escape';
				case KeyboardKeyCode.SPACE: return ' ';
				case KeyboardKeyCode.LEFT: return 'ArrowLeft';
				case KeyboardKeyCode.RIGHT: return 'ArrowRight';
				case KeyboardKeyCode.UP: return 'ArrowUp';
				case KeyboardKeyCode.DOWN: return 'ArrowDown';
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
			if (kc >= KeyboardKeyCode.A && kc <= KeyboardKeyCode.Z) {
				return 'Key' + String.fromCharCode(kc);
			}

			// 0-9 → Digit0
			if (kc >= KeyboardKeyCode.NUM_0 && kc <= KeyboardKeyCode.NUM_9) {
				return 'Digit' + (kc - KeyboardKeyCode.NUM_0);
			}

			// F1-F24
			if (kc >= KeyboardKeyCode.F1 && kc <= KeyboardKeyCode.F24) {
				return 'F' + (kc - KeyboardKeyCode.F1 + 1);
			}

			return KeyCodeToDomCode[kc] || KeyboardKeyCode[kc] || '';
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
	querySelectorForClassImpl(element, selector.substring(1), results, 0xffffffff);
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
